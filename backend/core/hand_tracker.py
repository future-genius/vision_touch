import os
import cv2
import time
import numpy as np
import mediapipe as mp
from backend.core.logger import logger
from backend.core.utils import WORKSPACE_ROOT, HAND_LANDMARKER_TASK_PATH

class JointKalmanFilter:
    """
    1D Linear Kalman Filter with velocity tracking for smoothing landmarks.
    """
    def __init__(self, dt=1.0/30.0, process_noise=1e-3, measurement_noise=1e-2):
        self.dt = dt
        self.x = np.array([0.0, 0.0]) # [pos, vel]
        self.P = np.eye(2) * 1.0
        self.A = np.array([[1.0, self.dt],
                           [0.0, 1.0]])
        self.H = np.array([[1.0, 0.0]])
        self.Q = np.array([[ (self.dt**4)/4, (self.dt**3)/2 ],
                           [ (self.dt**3)/2,  self.dt**2    ]]) * process_noise
        self.R = np.array([[measurement_noise]])

    def predict(self):
        self.x = np.dot(self.A, self.x)
        self.P = np.dot(np.dot(self.A, self.P), self.A.T) + self.Q
        return float(self.x[0])

    def update(self, measurement):
        self.predict()
        y = measurement - np.dot(self.H, self.x)[0]
        S = np.dot(np.dot(self.H, self.P), self.H.T) + self.R
        K = (np.dot(self.P, self.H.T) / S[0, 0]).flatten()
        self.x = self.x + K * y
        self.P = self.P - np.outer(K, np.dot(self.H, self.P))
        return float(self.x[0])


class HandTracker:
    def __init__(self, max_num_hands=2, min_detection_confidence=0.45, min_tracking_confidence=0.45):
        # Always use modern Tasks API for consistency and compatibility
        self.use_tasks = True
        self.max_num_hands = max_num_hands
        self.kalman_filters = {}
        self.occlusion_frames = 0
        self.last_valid_landmarks = []
        self.last_pseudo_depth = 0.0
        
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
                running_mode=vision.RunningMode.IMAGE,
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

    def get_kf(self, hand_idx, joint_idx, coord):
        key = (hand_idx, joint_idx, coord)
        if key not in self.kalman_filters:
            self.kalman_filters[key] = JointKalmanFilter()
        return self.kalman_filters[key]

    def estimate_pseudo_depth(self, landmarks):
        if len(landmarks) >= 21:
            w = landmarks[0]
            k5 = landmarks[5]
            k17 = landmarks[17]
            d5 = ((w["x"] - k5["x"])**2 + (w["y"] - k5["y"])**2 + (w["z"] - k5["z"])**2)**0.5
            d17 = ((w["x"] - k17["x"])**2 + (w["y"] - k17["y"])**2 + (w["z"] - k17["z"])**2)**0.5
            return (d5 + d17) / 2.0
        return 0.0

    def process_frame(self, frame):
        """
        Processes a BGR frame and returns (landmarks, tracking_status, raw_landmarks)
        """
        # Mirror / flip is done outside, ensure frame is contiguous C-order numpy array
        frame = np.ascontiguousarray(frame)
        landmarks_list = []
        raw_landmarks = None
        tracking_status = "Idle"
        
        if self.use_tasks:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb_frame = np.ascontiguousarray(rgb_frame)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            
            try:
                result = self.detector.detect(mp_image)
            except Exception as e:
                logger.error(f"MediaPipe Tasks detection error: {e}")
                return [], "Idle", None
                
            detected = result and result.hand_landmarks and len(result.hand_landmarks) > 0
            if detected:
                self.occlusion_frames = 0
                tracking_status = "Active"
                raw_landmarks = result.hand_landmarks[0]
                for idx, lm in enumerate(raw_landmarks):
                    kx = self.get_kf(0, idx, 'x').update(lm.x)
                    ky = self.get_kf(0, idx, 'y').update(lm.y)
                    kz = self.get_kf(0, idx, 'z').update(lm.z)
                    landmarks_list.append({
                        "x": kx,
                        "y": ky,
                        "z": kz
                    })
                self.last_valid_landmarks = landmarks_list
                self.last_pseudo_depth = self.estimate_pseudo_depth(landmarks_list)
            else:
                if self.occlusion_frames < 3 and self.last_valid_landmarks:
                    self.occlusion_frames += 1
                    tracking_status = "Coasting"
                    coasted = []
                    for idx in range(len(self.last_valid_landmarks)):
                        cx = self.get_kf(0, idx, 'x').predict()
                        cy = self.get_kf(0, idx, 'y').predict()
                        cz = self.get_kf(0, idx, 'z').predict()
                        coasted.append({
                            "x": cx,
                            "y": cy,
                            "z": cz
                        })
                    landmarks_list = coasted
                else:
                    self.occlusion_frames = 0
                    self.last_valid_landmarks = []
                    self.last_pseudo_depth = 0.0
            return landmarks_list, tracking_status, raw_landmarks
        else:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb_frame = np.ascontiguousarray(rgb_frame)
            results = self.hands.process(rgb_frame)

            detected = results.multi_hand_landmarks and len(results.multi_hand_landmarks) > 0
            if detected:
                self.occlusion_frames = 0
                tracking_status = "Active"
                raw_landmarks = results.multi_hand_landmarks[0]
                for idx, lm in enumerate(raw_landmarks.landmark):
                    kx = self.get_kf(0, idx, 'x').update(lm.x)
                    ky = self.get_kf(0, idx, 'y').update(lm.y)
                    kz = self.get_kf(0, idx, 'z').update(lm.z)
                    landmarks_list.append({
                        "x": kx,
                        "y": ky,
                        "z": kz
                    })
                self.last_valid_landmarks = landmarks_list
                self.last_pseudo_depth = self.estimate_pseudo_depth(landmarks_list)
            else:
                if self.occlusion_frames < 3 and self.last_valid_landmarks:
                    self.occlusion_frames += 1
                    tracking_status = "Coasting"
                    coasted = []
                    for idx in range(len(self.last_valid_landmarks)):
                        cx = self.get_kf(0, idx, 'x').predict()
                        cy = self.get_kf(0, idx, 'y').predict()
                        cz = self.get_kf(0, idx, 'z').predict()
                        coasted.append({
                            "x": cx,
                            "y": cy,
                            "z": cz
                        })
                    landmarks_list = coasted
                else:
                    self.occlusion_frames = 0
                    self.last_valid_landmarks = []
                    self.last_pseudo_depth = 0.0
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
