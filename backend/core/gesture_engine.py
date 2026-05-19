import os
import pickle
import time
import numpy as np
from collections import Counter
from backend.core.logger import logger
from backend.core.utils import config, MODEL_PATH, LABEL_ENCODER_PATH, map_legacy_gesture_keys

class GestureEngine:
    def __init__(self, standalone=True):
        self.standalone = standalone
        self.clf = None
        self.label_encoder = None
        
        # Load timing configurations
        g_conf = config.get("gestures", {})
        self.click_cooldown = g_conf.get("click_cooldown_ms", 400) / 1000.0
        self.scroll_cooldown = g_conf.get("scroll_cooldown_ms", 30) / 1000.0
        self.drag_cooldown = g_conf.get("drag_cooldown_ms", 30) / 1000.0
        self.stabilization_frames = g_conf.get("stabilization_frames", 4)
        self.drag_release_delay = g_conf.get("drag_release_delay_ms", 150) / 1000.0
        self.confidence_threshold = g_conf.get("confidence_threshold", 0.65)

        # Stabilization queue
        self.gesture_history = []

        # Action states
        self.last_action_times = {}
        self.last_gesture = None  # To enforce trigger-once click behavior
        self.drag_lost_time = None
        self.prev_thumb_y = None

        # Factory mappings for standalone modes
        self.mappings = [
            {"gesture_key": "OPEN_PALM", "action_type": "move"},
            {"gesture_key": "INDEX_ONLY", "action_type": "left_click", "cooldown": self.click_cooldown},
            {"gesture_key": "INDEX_MIDDLE_JOINED", "action_type": "right_click", "cooldown": self.click_cooldown},
            {"gesture_key": "INDEX_THUMB_PINCH", "action_type": "drag", "cooldown": self.drag_cooldown},
            {"gesture_key": "THUMB_ONLY", "action_type": "scroll", "cooldown": self.scroll_cooldown},
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
        Loads the pickled machine learning classifier models.
        Fail fast if missing in standalone CLI test modes.
        """
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

    def predict(self, landmarks):
        """
        Predicts label and confidence score from raw landmarks.
        """
        if self.clf is None or self.label_encoder is None:
            return "None", 0.0

        try:
            features = self.preprocess(landmarks).reshape(1, -1)
            pred_encoded = self.clf.predict(features)[0]
            confidence = float(self.clf.predict_proba(features)[0][pred_encoded])
            predicted_label = self.label_encoder.inverse_transform([pred_encoded])[0]
            
            return predicted_label, confidence
        except Exception as e:
            logger.debug(f"Prediction inference exception: {e}")
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
            "INDEX_ONLY": ["left_click", "pinch_click", "index_only"],
            "INDEX_THUMB_PINCH": ["drag", "two_finger_spread", "index_thumb_pinch"],
            "INDEX_MIDDLE_JOINED": ["right_click", "index_middle_joined"],
            "FIST": ["fist", "fist_pause"],
            "THUMB_ONLY": ["scroll", "thumb_only"],
            "THUMB_INDEX_MIDDLE": ["shortcut", "media", "app_launch", "thumb_index_middle"]
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

        # 4. Handle Scroll action
        if action_type == "scroll" and landmarks:
            thumb_tip = landmarks[4]
            current_y = thumb_tip["y"]
            if self.prev_thumb_y is not None:
                y_diff = current_y - self.prev_thumb_y
                # If thumb movement is fast enough
                if abs(y_diff) > 0.012:
                    direction = "up" if y_diff < 0 else "down"
                    # Scale scroll ticks by speed
                    amount = max(1, int(abs(y_diff) * 200))
                    mouse_ctrl.scroll(direction=direction, amount=amount)
                    action_name = f"Scroll {direction.upper()}"
                    self.last_action_times[action_type] = now
            self.prev_thumb_y = current_y
        else:
            self.prev_thumb_y = None

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
