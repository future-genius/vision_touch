import cv2
import numpy as np
from backend.core.logger import logger

class PoseHeadTracker:
    """
    Estimates head pose (pitch and yaw) using MediaPipe Face Mesh to assist pointer targeting.
    """
    def __init__(self):
        logger.info("Initializing MediaPipe Face Mesh for head pose/gaze estimation...")
        self.face_mesh = None
        self.is_active = False
        self.pitch = 0.0
        self.yaw = 0.0
        self.roll = 0.0
        
        try:
            import mediapipe.solutions.face_mesh as mp_face_mesh
            self.face_mesh = mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            logger.info("MediaPipe Face Mesh initialized successfully.")
        except Exception as e:
            logger.warning(f"MediaPipe Face Mesh solutions module not available: {e}. Head pose tracking is disabled.")

    def process_frame(self, frame):
        """
        Extracts pitch and yaw head rotation values.
        Returns (pitch, yaw) offsets scaled to range [-1.0, 1.0].
        """
        if frame is None or self.face_mesh is None:
            return 0.0, 0.0

        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)

            if results.multi_face_landmarks:
                self.is_active = True
                landmarks = results.multi_face_landmarks[0].landmark
                
                # Retrieve key points
                nose = np.array([landmarks[1].x, landmarks[1].y, landmarks[1].z])
                left_eye = np.array([landmarks[33].x, landmarks[33].y, landmarks[33].z])
                right_eye = np.array([landmarks[263].x, landmarks[263].y, landmarks[263].z])
                chin = np.array([landmarks[152].x, landmarks[152].y, landmarks[152].z])
                
                # Compute midpoints
                eye_mid = (left_eye + right_eye) / 2.0
                
                # Yaw (left-right rotation): horizontal relative displacement of nose
                # Eye-to-eye horizontal distance acts as normalizing scale
                eye_dist = np.linalg.norm(right_eye[:2] - left_eye[:2])
                if eye_dist > 0.001:
                    self.yaw = (nose[0] - eye_mid[0]) / eye_dist
                else:
                    self.yaw = 0.0

                # Pitch (up-down rotation): vertical relative displacement of nose
                face_height = np.linalg.norm(eye_mid[:2] - chin[:2])
                if face_height > 0.001:
                    # Normalized center point on face vertical axis
                    face_center_y = (eye_mid[1] + chin[1]) / 2.0
                    self.pitch = (nose[1] - face_center_y) / face_height
                else:
                    self.pitch = 0.0

                # Smooth and clamp outputs
                self.yaw = np.clip(self.yaw * 1.5, -1.0, 1.0)
                self.pitch = np.clip(self.pitch * 1.5, -1.0, 1.0)
                
                return self.pitch, self.yaw
            else:
                self.is_active = False
                return 0.0, 0.0
        except Exception as e:
            logger.warning(f"Error in head pose tracker: {e}")
            self.is_active = False
            return 0.0, 0.0

    def release(self):
        try:
            self.face_mesh.close()
        except Exception:
            pass
