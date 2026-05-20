import os
import pickle
import time
import math
import numpy as np
from collections import Counter
from backend.core.logger import logger
from backend.core.utils import config, MODEL_PATH, LABEL_ENCODER_PATH, map_legacy_gesture_keys

class HoltLinearSmoother:
    """
    Holt's Double Exponential Smoothing (Holt's Linear) for trend-aware signal smoothing.
    """
    def __init__(self, alpha=0.5, beta=0.3):
        self.alpha = alpha
        self.beta = beta
        self.s = None
        self.b = None

    def update(self, value):
        if self.s is None or self.b is None:
            self.s = value
            self.b = 0.0
            return value
        
        last_s = self.s
        self.s = self.alpha * value + (1.0 - self.alpha) * (self.s + self.b)
        self.b = self.beta * (self.s - last_s) + (1.0 - self.beta) * self.b
        return self.s + self.b


class GestureEngine:
    def __init__(self, standalone=True):
        self.standalone = standalone
        self.clf = None
        self.label_encoder = None
        self.ort_session = None
        self.use_onnx = False
        
        # Load timing configurations
        g_conf = config.get("gestures", {})
        self.click_cooldown = g_conf.get("click_cooldown_ms", 400) / 1000.0
        self.scroll_cooldown = g_conf.get("scroll_cooldown_ms", 30) / 1000.0
        self.drag_cooldown = g_conf.get("drag_cooldown_ms", 30) / 1000.0
        self.stabilization_frames = g_conf.get("stabilization_frames", 4)
        self.drag_release_delay = g_conf.get("drag_release_delay_ms", 150) / 1000.0
        self.confidence_threshold = g_conf.get("confidence_threshold", 0.65)

        # Stabilization and smoothing
        self.gesture_history = []
        self.conf_smoother = HoltLinearSmoother(alpha=0.6, beta=0.25)

        # Action states
        self.last_action_times = {}
        self.last_gesture = None  # To enforce trigger-once click behavior
        self.drag_lost_time = None
        self.prev_thumb_y = None

        # Factory mappings for standalone modes
        self.mappings = [
            {"gesture_key": "OPEN_PALM", "action_type": "move"},
            {"gesture_key": "INDEX_ONLY", "action_type": "scroll_up", "cooldown": self.scroll_cooldown},
            {"gesture_key": "INDEX_MIDDLE_JOINED", "action_type": "right_click", "cooldown": self.click_cooldown},
            {"gesture_key": "INDEX_THUMB_PINCH", "action_type": "scroll_down", "cooldown": self.scroll_cooldown},
            {"gesture_key": "THUMB_ONLY", "action_type": "left_click", "cooldown": self.click_cooldown},
            {"gesture_key": "FIST", "action_type": "pause"}
        ]

    def set_mappings(self, db_mappings):
        """
        Overwrites default mappings with database custom configurations.
        """
        self.standalone = False
        self.mappings = db_mappings
        logger.info(f"Gesture engine updated with {len(db_mappings)} database mappings.")

    def load_model(self):
        """
        Loads the gesture classifier models (ONNX format if available, fallback to pickled classifier).
        """
        onnx_conf = config.get("onnx", {})
        onnx_enabled = onnx_conf.get("enabled", False)
        onnx_path = onnx_conf.get("model_path", "backend/models/gesture_model.onnx")
        
        # Resolve absolute path for model
        if not os.path.isabs(onnx_path):
            from backend.core.utils import WORKSPACE_ROOT
            onnx_path = os.path.join(WORKSPACE_ROOT, onnx_path)

        if onnx_enabled and os.path.exists(onnx_path):
            try:
                import onnxruntime as ort
                # Load label encoder
                if os.path.exists(LABEL_ENCODER_PATH):
                    with open(LABEL_ENCODER_PATH, "rb") as f:
                        self.label_encoder = pickle.load(f)
                
                # Check for GPU (CUDA) provider, default to CPU
                available_providers = ort.get_available_providers()
                providers = ['CUDAExecutionProvider', 'CPUExecutionProvider'] if 'CUDAExecutionProvider' in available_providers else ['CPUExecutionProvider']
                self.ort_session = ort.InferenceSession(onnx_path, providers=providers)
                self.use_onnx = True
                logger.info(f"ONNX gesture classifier model loaded successfully on providers: {self.ort_session.get_providers()}")
                return True
            except Exception as e:
                logger.error(f"Failed to load ONNX session: {e}. Falling back to pickle.")
                self.use_onnx = False
        else:
            self.use_onnx = False

        # Pickle fallback
        if not os.path.exists(MODEL_PATH) or not os.path.exists(LABEL_ENCODER_PATH):
            logger.warning("Classifier models not found on disk.")
            return False

        try:
            with open(MODEL_PATH, "rb") as f:
                self.clf = pickle.load(f)
            with open(LABEL_ENCODER_PATH, "rb") as f:
                self.label_encoder = pickle.load(f)
            logger.info("RandomForest gesture classifier model loaded successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to load pickled model: {e}")
            return False

    def preprocess(self, landmarks):
        """
        Normalizes a 21-joint landmark list relative to the wrist coordinate
        and scales relative to palm size.
        """
        pts = []
        for lm in landmarks:
            if isinstance(lm, dict):
                pts.append([lm['x'], lm['y'], lm['z']])
            elif hasattr(lm, 'x'):
                pts.append([lm.x, lm.y, lm.z])
            else:
                pts.append([lm[0], lm[1], lm[2]])
                
        pts = np.array(pts)
        wrist = pts[0]
        translated = pts - wrist
        
        # Palm scale uses distance from wrist (0) to index MCP (5)
        p5 = translated[5]
        palm_size = np.linalg.norm(p5)
        if palm_size < 1e-5:
            palm_size = 1e-5
            
        normalized = translated / palm_size
        return normalized.flatten()

    def _get_coords(self, lm):
        if isinstance(lm, dict):
            return lm
        elif hasattr(lm, 'x'):
            return {"x": lm.x, "y": lm.y, "z": lm.z}
        else:
            return {"x": lm[0], "y": lm[1], "z": lm[2]}

    def predict(self, landmarks):
        """
        Predicts label and confidence score from raw landmarks.
        Uses a high-performance heuristic classifier first.
        """
        if not landmarks or len(landmarks) < 21:
            return "None", 0.0

        try:
            lm = [self._get_coords(l) for l in landmarks]

            # Calculate distance between two joints
            def dist(a, b):
                return math.sqrt((a['x'] - b['x'])**2 + (a['y'] - b['y'])**2 + (a['z'] - b['z'])**2)

            # Finger extension heuristics (wrist reference 0)
            index_extended = dist(lm[8], lm[0]) > dist(lm[6], lm[0]) * 1.10
            middle_extended = dist(lm[12], lm[0]) > dist(lm[10], lm[0]) * 1.10
            ring_extended = dist(lm[16], lm[0]) > dist(lm[14], lm[0]) * 1.10
            pinky_extended = dist(lm[20], lm[0]) > dist(lm[18], lm[0]) * 1.10
            
            # Thumb extension: check distance from thumb tip (4) to index knuckle (5)
            # An extended thumb is far from the index knuckle, folded thumb is close.
            thumb_extended = dist(lm[4], lm[5]) > dist(lm[2], lm[5]) * 1.12

            # Key distances for pinches & joints
            index_thumb_dist = dist(lm[8], lm[4])
            index_middle_dist = dist(lm[8], lm[12])
            
            # Palm reference scale: Wrist (0) to index MCP (5)
            palm_scale = dist(lm[0], lm[5])
            if palm_scale < 1e-5:
                palm_scale = 1e-5

            # Normalized thresholds scaled dynamically to palm size
            pinch_threshold = palm_scale * 0.40
            joined_threshold = palm_scale * 0.30

            # 1. INDEX_THUMB_PINCH (Text selection / Drag / Left Click)
            if index_thumb_dist < pinch_threshold:
                return "INDEX_THUMB_PINCH", 1.0

            # 2. FIST (Closed hand) – all fingers folded
            if not (index_extended or middle_extended or ring_extended or pinky_extended):
                return "FIST", 1.0

            # 3. INDEX_MIDDLE_JOINED (Right click)
            if index_extended and middle_extended and not ring_extended and not pinky_extended:
                if index_middle_dist < joined_threshold:
                    return "INDEX_MIDDLE_JOINED", 1.0

            # 4. INDEX_ONLY (Scroll up)
            if index_extended and not (middle_extended or ring_extended or pinky_extended):
                return "INDEX_ONLY", 1.0

            # 5. THUMB_ONLY (Scroll down)
            if thumb_extended and not (index_extended or middle_extended or ring_extended or pinky_extended):
                return "THUMB_ONLY", 1.0

            # 6. OPEN_PALM (Pointer movement)
            if index_extended and middle_extended and ring_extended and pinky_extended:
                return "OPEN_PALM", 1.0

            # Fallback counts for partial/loose open palm gestures
            extended_count = sum([index_extended, middle_extended, ring_extended, pinky_extended])
            if extended_count >= 3:
                return "OPEN_PALM", 0.90
                
        except Exception as e:
            logger.debug(f"Heuristic classifier exception: {e}")

        return "None", 0.0

    def stabilize(self, raw_label):
        """
        Stabilizes raw labels by majority voting over a rolling queue.
        """
        self.gesture_history.append(raw_label)
        if len(self.gesture_history) > self.stabilization_frames:
            self.gesture_history.pop(0)

        counts = Counter(self.gesture_history)
        most_common, count = counts.most_common(1)[0]
        
        # Enforce majority threshold (e.g. at least half + 1)
        if count >= (len(self.gesture_history) // 2 + 1):
            return most_common
        return "None"

    def find_mapping(self, label):
        """
        Finds configured actions for the given gesture label.
        Matches either direct label key, or maps legacy formats.
        """
        normalized_label = map_legacy_gesture_keys(label)
        keys_to_search = {
            "OPEN_PALM": ["move", "index_pointer", "open_palm"],
            "INDEX_ONLY": ["scroll_up", "index_only"],
            "INDEX_THUMB_PINCH": ["scroll_down", "index_thumb_pinch"],
            "INDEX_MIDDLE_JOINED": ["right_click", "index_middle_joined"],
            "FIST": ["pause", "fist"],
            "THUMB_ONLY": ["left_click", "thumb_only"],
            "THUMB_INDEX_MIDDLE": ["shortcut", "media", "app_launch", "thumb_index_middle", "double_click"]
        }.get(normalized_label, [normalized_label.lower()])

        for map_item in self.mappings:
            g_key = map_item.get("gesture_key", "").lower()
            if g_key in keys_to_search or g_key == normalized_label.lower():
                return map_item
        return None

    def execute_action(self, gesture, landmarks, mouse_ctrl):
        """
        Interprets stabilized gesture, performs timing debounces,
        and routes tasks to mouse_controller.
        """
        now = time.time()
        action_name = "None"
        
        # 1. Look up action mapping
        mapping = self.find_mapping(gesture)
        action_type = mapping.get("action_type") if mapping else None
        
        # Enforce trigger-once logic for clicking actions
        is_click = action_type in ["left_click", "right_click", "double_click"]

        # If gesture changes, reset trigger once gate
        if gesture != self.last_gesture:
            if gesture in ["None", "OPEN_PALM", "FIST"]:
                self.last_gesture = None

        # 2. Check cooldowns
        cooldown = mapping.get("cooldown", self.click_cooldown) if mapping else self.click_cooldown
        last_exec = self.last_action_times.get(action_type, 0.0)
        
        if is_click and gesture == self.last_gesture:
            # Click already triggered for this gesture activation
            return "Pointer Movement" if gesture != "FIST" else "Paused"

        # Apply specific cooldowns
        if action_type == "scroll":
            cooldown = self.scroll_cooldown
        elif action_type == "drag":
            cooldown = self.drag_cooldown

        # If inside cooldown window, skip action execution
        if now - last_exec < cooldown:
            # Still update mouse coordinates for continuous cursor tracking during cooldowns
            if gesture != "FIST" and gesture != "None":
                return "Pointer Movement"
            return "Paused"

        # 3. Handle Drag release debounce window
        if action_type == "drag":
            self.drag_lost_time = None
            mouse_ctrl.start_drag()
            action_name = "Text Selection / Drag"
            self.last_action_times[action_type] = now
        else:
            if mouse_ctrl.is_dragging:
                # Drag gesture was lost. Initiate release timer.
                if self.drag_lost_time is None:
                    self.drag_lost_time = now
                    action_name = "Drag Releasing (Debounce)"
                elif now - self.drag_lost_time >= self.drag_release_delay:
                    mouse_ctrl.stop_drag()
                    self.drag_lost_time = None
                    action_name = "Drag Released"
            else:
                self.drag_lost_time = None

        # 4. Handle Scroll actions
        if action_type == "scroll_up":
            mouse_ctrl.scroll(direction="up", amount=1)
            action_name = "Scroll UP"
            self.last_action_times[action_type] = now
        elif action_type == "scroll_down":
            mouse_ctrl.scroll(direction="down", amount=1)
            action_name = "Scroll DOWN"
            self.last_action_times[action_type] = now

        # 5. Process clicks
        if is_click and now - last_exec >= cooldown:
            if action_type == "left_click":
                mouse_ctrl.left_click()
                action_name = "Left Click"
            elif action_type == "right_click":
                mouse_ctrl.right_click()
                action_name = "Right Click"
            elif action_type == "double_click":
                mouse_ctrl.double_click()
                action_name = "Double Click"
            
            self.last_action_times[action_type] = now
            self.last_gesture = gesture

        # 6. Fallback defaults (move / pause)
        if action_type == "move":
            action_name = "Pointer Movement"
        elif action_type == "pause":
            action_name = "Tracking Paused"
        elif action_name == "None" and gesture != "None":
            action_name = "Pointer Movement"

        return action_name
