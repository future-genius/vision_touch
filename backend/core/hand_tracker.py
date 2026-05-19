import os
import cv2
import time
import numpy as np
import mediapipe as mp
from backend.core.logger import logger
from backend.core.utils import WORKSPACE_ROOT, HAND_LANDMARKER_TASK_PATH

class HandTracker:
    def __init__(self, max_num_hands=1, min_detection_confidence=0.45, min_tracking_confidence=0.45):
        # Determine if we should use modern Tasks API or legacy Solutions
        self.use_tasks = not hasattr(mp, "solutions") or not hasattr(mp.solutions, "hands")
        
        if self.use_tasks:
            logger.info("Initializing modern MediaPipe Tasks HandLandmarker...")
            try:
                from mediapipe.tasks import python
                from mediapipe.tasks.python import vision
            except ImportError as e:
                logger.error("MediaPipe Tasks API requested but python tasks modules are not importable.")
                raise e

            # Search for task file
            model_path = HAND_LANDMARKER_TASK_PATH
            if not os.path.exists(model_path):
                # Fallback to backend/models/
                model_path = os.path.join(WORKSPACE_ROOT, "backend", "models", "hand_landmarker.task")
                
            if not os.path.exists(model_path):
                err_msg = (
                    f"[ERROR] MediaPipe hand landmarker task file missing!\n"
                    f"Expected location: {HAND_LANDMARKER_TASK_PATH}\n"
                    "Please download 'hand_landmarker.task' and place it in the public folder."
                )
                logger.error(err_msg)
                raise FileNotFoundError(err_msg)

            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.HandLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.VIDEO,
                num_hands=max_num_hands,
                min_hand_detection_confidence=min_detection_confidence,
                min_hand_presence_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence
            )
            self.detector = vision.HandLandmarker.create_from_options(options)
            self.start_time = time.time()
        else:
            logger.info("Initializing legacy MediaPipe Solutions Hands...")
            self.mp_hands = mp.solutions.hands
            self.mp_draw = mp.solutions.drawing_utils
            self.hands = self.mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=max_num_hands,
                min_detection_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence
            )

    def process_frame(self, frame):
        """
        Processes a BGR frame and returns (landmarks, tracking_status, raw_landmarks)
        """
        # Mirror / flip is done outside, ensure frame is contiguous C-order numpy array
        frame = np.ascontiguousarray(frame)
        
        if self.use_tasks:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb_frame = np.ascontiguousarray(rgb_frame)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            
            timestamp_ms = int((time.time() - self.start_time) * 1000)
            
            try:
                result = self.detector.detect_for_video(mp_image, timestamp_ms)
            except Exception as e:
                logger.error(f"MediaPipe Tasks detection error: {e}")
                return [], "Idle", None
                
            landmarks_list = []
            raw_landmarks = None
            tracking_status = "Idle"

            if result and result.hand_landmarks and len(result.hand_landmarks) > 0:
                tracking_status = "Active"
                raw_landmarks = result.hand_landmarks[0]
                for lm in raw_landmarks:
                    landmarks_list.append({
                        "x": lm.x,
                        "y": lm.y,
                        "z": lm.z
                    })
            return landmarks_list, tracking_status, raw_landmarks
        else:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb_frame = np.ascontiguousarray(rgb_frame)
            results = self.hands.process(rgb_frame)

            landmarks_list = []
            raw_landmarks = None
            tracking_status = "Idle"

            if results.multi_hand_landmarks:
                tracking_status = "Active"
                raw_landmarks = results.multi_hand_landmarks[0]
                for lm in results.multi_hand_landmarks[0].landmark:
                    landmarks_list.append({
                        "x": lm.x,
                        "y": lm.y,
                        "z": lm.z
                    })
            return landmarks_list, tracking_status, raw_landmarks

    def draw_skeleton(self, frame, raw_landmarks):
        """
        Draws hand skeleton connections and joints on an OpenCV BGR frame.
        """
        if not raw_landmarks:
            return frame
            
        if self.use_tasks:
            h, w, _ = frame.shape
            connections = [
                (0, 1), (1, 2), (2, 3), (3, 4), # Thumb
                (0, 5), (5, 6), (6, 7), (7, 8), # Index
                (9, 10), (10, 11), (11, 12),    # Middle
                (13, 14), (14, 15), (15, 16),   # Ring
                (0, 17), (17, 18), (18, 19), (19, 20), # Pinky
                (5, 9), (9, 13), (13, 17)       # Palm
            ]
            for start_idx, end_idx in connections:
                if start_idx < len(raw_landmarks) and end_idx < len(raw_landmarks):
                    pt1 = (int(raw_landmarks[start_idx].x * w), int(raw_landmarks[start_idx].y * h))
                    pt2 = (int(raw_landmarks[end_idx].x * w), int(raw_landmarks[end_idx].y * h))
                    cv2.line(frame, pt1, pt2, (255, 255, 255), 2)
            for idx, lm in enumerate(raw_landmarks):
                cx, cy = int(lm.x * w), int(lm.y * h)
                color = (0, 255, 0) if idx in [4, 8, 12, 16, 20] else (0, 0, 255)
                cv2.circle(frame, (cx, cy), 6, color, -1)
                cv2.circle(frame, (cx, cy), 6, (255, 255, 255), 1)
        else:
            self.mp_draw.draw_landmarks(frame, raw_landmarks, self.mp_hands.HAND_CONNECTIONS)
            
        return frame
