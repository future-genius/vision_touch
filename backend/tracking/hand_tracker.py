import cv2
import mediapipe as mp

class HandTracker:
    def __init__(self, max_num_hands=1, min_detection_confidence=0.7, min_tracking_confidence=0.5):
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
        Processes a BGR frame, runs MediaPipe, and returns (landmarks, tracking_status, raw_landmarks)
        """
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)

        landmarks_list = []
        raw_landmarks = None
        tracking_status = "Idle"

        if results.multi_hand_landmarks:
            tracking_status = "Active"
            # Get the first hand
            raw_landmarks = results.multi_hand_landmarks[0]
            for lm in raw_landmarks.landmark:
                landmarks_list.append({
                    "x": lm.x,
                    "y": lm.y,
                    "z": lm.z
                })
        else:
            tracking_status = "Idle"

        return landmarks_list, tracking_status, raw_landmarks

    def draw_skeleton(self, frame, raw_landmarks):
        """
        Draws hand landmarks skeleton on the local CV2 debug frame.
        """
        if raw_landmarks:
            self.mp_draw.draw_landmarks(frame, raw_landmarks, self.mp_hands.HAND_CONNECTIONS)
        return frame
