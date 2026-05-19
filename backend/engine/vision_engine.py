import os
import sys

# Remove local backend directories from sys.path to prevent name collisions (e.g. backend/realtime)
script_dir = os.path.abspath(os.path.dirname(__file__))
parent_dir = os.path.abspath(os.path.join(script_dir, ".."))
if script_dir in sys.path:
    sys.path.remove(script_dir)
if parent_dir in sys.path:
    sys.path.remove(parent_dir)

# Add workspace root at the beginning of the path
workspace_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

import cv2
import pyautogui
import asyncio
import time
import threading
import pickle
import numpy as np
from backend.config import settings
from backend.tracking.hand_tracker import HandTracker
from backend.engine.cursor_controller import CursorController
from backend.engine.gesture_executor import ActionExecutor
from backend.engine.websocket_server import WsServer
from backend.services.db_service import DbService
from backend.training.preprocess_dataset import DatasetPreprocessor

class ThreadedVideoCapture:
    def __init__(self, index, cap_api=None):
        if cap_api is not None:
            self.cap = cv2.VideoCapture(index, cap_api)
        else:
            self.cap = cv2.VideoCapture(index, cv2.CAP_DSHOW) if os.name == 'nt' else cv2.VideoCapture(index)
            
        self.grabbed = False
        self.frame = None
        self.is_running = False
        self.read_lock = threading.Lock()
        
    def start(self):
        if self.cap.isOpened():
            self.grabbed, self.frame = self.cap.read()
            self.is_running = True
            self.thread = threading.Thread(target=self.update, args=())
            self.thread.daemon = True
            self.thread.start()
        return self
        
    def update(self):
        while self.is_running:
            if self.cap.isOpened():
                grabbed, frame = self.cap.read()
                if grabbed:
                    with self.read_lock:
                        self.grabbed = grabbed
                        self.frame = frame
            time.sleep(0.005) # Prevent CPU starvation
            
    def read(self):
        with self.read_lock:
            if self.frame is not None:
                return self.grabbed, self.frame.copy()
            return self.grabbed, None
            
    def isOpened(self):
        return self.cap.isOpened()
        
    def release(self):
        self.is_running = False
        if hasattr(self, 'thread'):
            self.thread.join(timeout=1.0)
        self.cap.release()

class VisionEngine:
    def __init__(self, debug_mode=False):
        self.debug_mode = debug_mode
        self.is_running = False
        self.cap = None
        self.working_index = 0
        self.capture_thread = None
        
        # Initialize modular services
        self.tracker = HandTracker()
        self.cursor = CursorController()
        self.executor = ActionExecutor()
        self.db = DbService()
        self.ws = WsServer()
        self.ws.set_engine(self)
        
        # Dynamic Gesture Action Registries (fetched from DB)
        self.active_mappings = []
        
        # Landmark feeding/dataset generation configurations
        self.feed_mode = False
        self.feed_gesture_key = None
        self.last_feed_time = time.time()
        
        # Machine Learning Model Checkpoints
        self.clf = None
        self.label_encoder = None
        self.load_ml_model()
        
        # Load mappings from DB cache
        self.reload_registry()

        # Gesture Stabilization Window (prevents flickering)
        self.gesture_history = []
        self.stabilization_frames = 3

        # Scrolling tracker
        self.prev_thumb_y = None

    def load_ml_model(self):
        """
        Dynamically loads the RandomForest models from the checkpoints.
        If checkpoints do not exist, runs the trainer to bootstrap them instantly.
        """
        print("[Engine] Querying ML Model checkpoints...")
        if not os.path.exists(settings.MODEL_PATH) or not os.path.exists(settings.LABEL_ENCODER_PATH):
            print("[Engine] ML Checkpoints not found. Bootstrapping training pipeline...")
            try:
                from backend.training.train_model import GestureModelTrainer
                trainer = GestureModelTrainer()
                trainer.train()
            except Exception as e:
                print(f"[Engine] Training bootstrap warning: {e}")

        if os.path.exists(settings.MODEL_PATH) and os.path.exists(settings.LABEL_ENCODER_PATH):
            try:
                with open(settings.MODEL_PATH, "rb") as f:
                    self.clf = pickle.load(f)
                with open(settings.LABEL_ENCODER_PATH, "rb") as f:
                    self.label_encoder = pickle.load(f)
                print(f"[Engine] Serialized RandomForest model hot-loaded successfully!")
            except Exception as e:
                print(f"[Engine] Model loading exception: {e}")
        else:
            print("[Engine] Warning: Engine operating without active ML Classifier.")

    def reload_registry(self):
        """
        Pulls dynamic mapping guidelines from DB.
        """
        try:
            self.active_mappings = self.db.fetch_gesture_mappings()
            print(f"[Engine] Loaded {len(self.active_mappings)} active gesture-action mappings.")
            return True
        except Exception as e:
            print(f"[Engine] Registry update skipped: {e}")
            return False

    def update_cursor_settings(self, sensitivity=None, smoothing=None, dead_zone=None):
        self.cursor.set_config(sensitivity, smoothing, dead_zone)

    def calibrate_coordinate(self, norm_x, norm_y):
        self.cursor.add_calibration_point(norm_x, norm_y)

    def start_feed_mode(self, gesture_key):
        self.feed_mode = True
        self.feed_gesture_key = gesture_key
        print(f"[Engine] Landmark database feeding mode active for: {gesture_key}")

    def stop_feed_mode(self):
        self.feed_mode = False
        self.feed_gesture_key = None
        print("[Engine] Landmark database feeding mode deactivated.")

    def start_capture(self, cam_index=None):
        if self.is_running:
            return
            
        print("[Engine] Initializing CV2 camera capture stream...")
        
        working_index = None
        
        # If a specific camera index is requested, try that first
        if cam_index is not None:
            try:
                cap = cv2.VideoCapture(cam_index, cv2.CAP_DSHOW) if os.name == 'nt' else cv2.VideoCapture(cam_index)
                if cap and cap.isOpened():
                    success, test_frame = cap.read()
                    if success and test_frame is not None:
                        mean_val = np.mean(test_frame)
                        print(f"[Engine] Explicitly requested Camera index {cam_index} opened. Average brightness: {mean_val:.1f}")
                        if mean_val < 8.0:
                            print(f"[Engine] ⚠️ WARNING: Camera {cam_index} is completely black! Make sure privacy shutter is open.")
                        working_index = cam_index
                    cap.release()
            except Exception as cam_err:
                print(f"[Engine] Testing requested camera index {cam_index} failed: {cam_err}")

        # If no index was provided or the selected one failed, search for first working camera (restricted to physical webcams [0, 1])
        if working_index is None:
            for index in [0, 1]:
                try:
                    cap = cv2.VideoCapture(index, cv2.CAP_DSHOW) if os.name == 'nt' else cv2.VideoCapture(index)
                    if not cap or not cap.isOpened():
                        if index == 0:
                            print("\n[Engine] ⚠️ WARNING: Primary webcam (Index 0) failed to open! It is likely locked/in-use by another application (such as Chrome running your Netlify tab, Zoom, or Teams). Please close other camera apps to allow the Python backend to take control.")
                        continue
                        
                    success, test_frame = cap.read()
                    if success and test_frame is not None:
                        mean_val = np.mean(test_frame)
                        print(f"[Engine] Testing camera index {index}... Mean brightness: {mean_val:.1f}")
                        if mean_val > 8.0:
                            print(f"[Engine] Camera index {index} verified successfully as active color source! (Frame shape: {test_frame.shape})")
                            working_index = index
                            cap.release()
                            break
                        else:
                            print(f"[Engine] Camera index {index} is a black stream (mean: {mean_val:.1f}). Scanning next camera...")
                    cap.release()
                except Exception as cam_err:
                    print(f"[Engine] Testing camera {index} raised warning: {cam_err}")
                
        if working_index is None:
            print("\n[Engine] ❌ ERROR: No active, working webcam could be opened!")
            return
        
        # Start threaded video capture for zero buffer lag
        self.working_index = working_index
        self.cap = ThreadedVideoCapture(working_index)
        self.cap.start()
        
        self.is_running = True
        self.capture_thread = threading.Thread(target=self.run_capture_loop)
        self.capture_thread.daemon = True
        self.capture_thread.start()
        print(f"[Engine] Threaded camera stream started on device index {working_index}.")

    def stop_capture(self):
        self.is_running = False
        if self.capture_thread:
            self.capture_thread.join(timeout=2.0)
            self.capture_thread = None
            
        if self.cap:
            self.cap.release()
            self.cap = None
            
        cv2.destroyAllWindows()
        self.executor.terminate_continuous_actions()
        print("[Engine] Camera capture stopped and resources released.")

    def predict_gesture(self, landmarks):
        """
        Feeds landmarks to preprocessor and infers via RandomForest.
        """
        if self.clf is None or self.label_encoder is None:
            return "None", 0.0

        try:
            # Preprocess landmarks
            feat = DatasetPreprocessor.normalize_single_hand(landmarks).reshape(1, -1)
            
            # Prediction
            pred_encoded = self.clf.predict(feat)[0]
            predicted_label = self.label_encoder.inverse_transform([pred_encoded])[0]
            
            # Probability confidence score
            prob = self.clf.predict_proba(feat)[0]
            confidence = float(prob[pred_encoded] * 100.0)
            
            return predicted_label, confidence
        except Exception as e:
            if self.debug_mode:
                print(f"[Engine] ML inference exception: {e}")
            return "None", 0.0

    def get_stabilized_gesture(self, predicted_label):
        """
        Maintains a rolling history queue to verify gesture persistence (reduces flickering).
        """
        self.gesture_history.append(predicted_label)
        if len(self.gesture_history) > self.stabilization_frames:
            self.gesture_history.pop(0)

        # Mode-based gesture stabilization (majority voting)
        if len(self.gesture_history) > 0:
            from collections import Counter
            counts = Counter(self.gesture_history)
            most_common, count = counts.most_common(1)[0]
            
            # If the most common gesture represents the majority of frames, return it
            if count >= (len(self.gesture_history) // 2 + 1):
                return most_common
                
        return "None"

    def run_capture_loop(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        fps = 0
        last_time = time.time()
        consecutive_failures = 0
        frame_counter = 0
        
        while self.is_running and self.cap:
            start_frame_time = time.time()
            
            # 1. Read Frame
            success, frame = self.cap.read()
            t_read = (time.time() - start_frame_time) * 1000
            
            if not success or frame is None:
                consecutive_failures += 1
                if consecutive_failures > 150:
                    print("[Engine] Camera stalled. Recovering...")
                    self.cap.release()
                    time.sleep(0.5)
                    self.cap = ThreadedVideoCapture(self.working_index)
                    self.cap.start()
                    consecutive_failures = 0
                time.sleep(0.01)
                continue
                
            consecutive_failures = 0
            frame_counter += 1
            
            # Mirror frame
            frame = cv2.flip(frame, 1)
            frame = np.ascontiguousarray(frame)
            
            # 2. Hand Tracking
            t_track_start = time.time()
            landmarks, tracking_status, raw_landmarks = self.tracker.process_frame(frame)
            t_track = (time.time() - t_track_start) * 1000
            
            # Inference state variables
            predicted_label = "None"
            confidence = 0.0
            cursor_x, cursor_y = pyautogui.position()
            action_executed_name = "None"
            
            # 3. Model Prediction and Stabilization
            t_classify_start = time.time()
            if tracking_status == "Active" and landmarks:
                raw_pred, raw_conf = self.predict_gesture(landmarks)
                
                # Filter out low-confidence predictions to prevent false positives
                if raw_conf >= 55.0:
                    predicted_label = self.get_stabilized_gesture(raw_pred)
                    confidence = raw_conf
            else:
                self.gesture_history.clear()
                self.executor.terminate_continuous_actions()
            t_classify = (time.time() - t_classify_start) * 1000
            
            # 4. Action Dispatching & Cursor Moving
            t_action_start = time.time()
            if tracking_status == "Active" and landmarks:
                # Find matching dynamic action
                matched_mapping = self.find_action_mapping(predicted_label)
                
                # Check for dynamic real-time scrolling intercept
                if predicted_label == "THUMB_ONLY":
                    # Dynamic y-coordinate scrolling (Thumb tip Joint 4)
                    thumb_tip = landmarks[4]
                    current_y = thumb_tip["y"]
                    
                    if self.prev_thumb_y is not None:
                        y_diff = current_y - self.prev_thumb_y
                        # Threshold of 0.012 filters out hand micro-shaking
                        if abs(y_diff) > 0.012:
                            direction = "up" if y_diff < 0 else "down"
                            scroll_amount = int(abs(y_diff) * 200)
                            scroll_params = {"direction": direction, "amount": scroll_amount}
                            self.executor.execute("scroll", scroll_params, 0.03, "scroll")
                            action_executed_name = f"Scroll {direction.upper()}"
                    self.prev_thumb_y = current_y
                else:
                    self.prev_thumb_y = None
                    
                    # Heuristic Fallback: If no mapping is found or if it is a move/None gesture,
                    # guarantee that pointer movement is executed so the cursor never freezes!
                    if not matched_mapping or matched_mapping.get("action_type") == "move" or predicted_label in ["None", "OPEN_PALM"]:
                        # Smooth movement LERP using index tip (Joint 8)
                        index_tip = landmarks[8]
                        act_sens = matched_mapping.get("sensitivity", 1.0) if matched_mapping else 1.0
                        self.cursor.sensitivity = settings.CURSOR_DEFAULT_SENSITIVITY * act_sens
                        cursor_x, cursor_y = self.cursor.move_to(index_tip["x"], index_tip["y"])
                        action_executed_name = "Pointer Movement"
                    else:
                        action_type = matched_mapping.get("action_type")
                        act_params = matched_mapping.get("action_parameters", {})
                        act_cooldown = matched_mapping.get("cooldown", 0.4)
                        act_sens = matched_mapping.get("sensitivity", 1.0)
                        
                        # Pointer index landmark (Joint 8 tip of index finger)
                        index_tip = landmarks[8]
                        
                        # Update sensitivity factor on cursor controller
                        self.cursor.sensitivity = settings.CURSOR_DEFAULT_SENSITIVITY * act_sens
                        
                        if action_type == "drag":
                            # Continuous Drag
                            cursor_x, cursor_y = self.cursor.move_to(index_tip["x"], index_tip["y"])
                            self.executor.execute("drag", act_params, act_cooldown, "drag")
                            action_executed_name = "Text Selection / Drag"
                            
                        elif action_type in ["left_click", "right_click", "double_click", "scroll", "shortcut", "media", "app_launch"]:
                            # Instant clicks / scrolls
                            success_act = self.executor.execute(action_type, act_params, act_cooldown, action_type)
                            if success_act:
                                action_executed_name = matched_mapping.get("action_name", action_type)
                            
                # 5. Continuous Landmark Seeding/Dataset record
                if self.feed_mode and self.feed_gesture_key:
                    now_ms = time.time()
                    if now_ms - self.last_feed_time >= 0.35:
                        self.last_feed_time = now_ms
                        # Save sample
                        self.db.upload_dataset_sample(
                            gesture_key=self.feed_gesture_key,
                            landmark_vectors=landmarks,
                            sample_quality=confidence/100.0 if confidence > 0 else 0.95
                        )
                        loop.run_until_complete(self.ws.broadcast({
                            "type": "dataset_uploaded",
                            "data": {
                                "gesture_key": self.feed_gesture_key,
                                "samples_count": 1
                            }
                        }))
            else:
                self.executor.terminate_continuous_actions()
                self.prev_thumb_y = None
                
            t_action = (time.time() - t_action_start) * 1000
            
            # Calculate performance diagnostics
            now_time = time.time()
            fps = int(1.0 / (now_time - last_time)) if (now_time - last_time) > 0 else 60
            last_time = now_time
            inference_time = (time.time() - start_frame_time) * 1000
            
            # Retrieve beautiful dynamic mapping names
            info = settings.GESTURE_INFO.get(predicted_label, {})
            human_gesture_name = info.get("name", predicted_label)

            # 6. Broadcast Synchronized Telemetry
            t_broadcast_start = time.time()
            payload = {
                "type": "hand_landmarks",
                "data": {
                    "gesture": human_gesture_name,
                    "gesture_key": predicted_label,
                    "confidence": confidence,
                    "fps": fps,
                    "landmarkCount": len(landmarks),
                    "landmarks": landmarks,
                    "inferenceTimeMs": inference_time,
                    "trackingStatus": tracking_status,
                    "cursorX": cursor_x,
                    "cursorY": cursor_y,
                    "actionState": action_executed_name,
                    "isFeeding": self.feed_mode,
                    "feedGestureKey": self.feed_gesture_key
                }
            }
            loop.run_until_complete(self.ws.broadcast(payload))
            t_broadcast = (time.time() - t_broadcast_start) * 1000
            
            # Debug Profiling logs
            if self.debug_mode and frame_counter % 30 == 0:
                print(f"[Profiler] Loop: {inference_time:.1f}ms | Capture: {t_read:.1f}ms | MP: {t_track:.1f}ms | RandomForest: {t_classify:.1f}ms | Sync: {t_broadcast:.1f}ms")
                
            if self.debug_mode:
                # Silent debug mode - performs console telemetry updates without raw window popups
                pass
                    
            time.sleep(0.005)
            
        loop.close()

    def find_action_mapping(self, predicted_label):
        """
        Bridges machine learning labels with database configured gesture_keys
        to deliver 100% dynamic action customization.
        """
        # Mapping helpers
        ml_bridges = {
            "OPEN_PALM": ["move", "index_pointer", "open_palm"],
            "INDEX_ONLY": ["left_click", "pinch_click", "index_only"],
            "INDEX_THUMB_PINCH": ["drag", "two_finger_spread", "index_thumb_pinch"],
            "INDEX_MIDDLE_JOINED": ["right_click", "index_middle_joined"],
            "FIST": ["fist", "fist_pause"],
            "THUMB_ONLY": ["scroll", "thumb_only"],
            "THUMB_INDEX_MIDDLE": ["shortcut", "media", "app_launch", "thumb_index_middle"]
        }

        keys_to_search = ml_bridges.get(predicted_label, [predicted_label.lower()])

        for m in self.active_mappings:
            g_key = m.get("gesture_key", "").lower()
            if g_key in keys_to_search or g_key == predicted_label.lower():
                return m
        return None
