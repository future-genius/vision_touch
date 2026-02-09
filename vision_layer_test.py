import cv2
import mediapipe as mp
import pyautogui
import joblib
import numpy as np
import time

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# ---------------- LOAD ML MODEL ----------------
model = joblib.load("gesture_model.pkl")

# ---------------- MEDIAPIPE HAND LANDMARKER ----------------
base_options = python.BaseOptions(
    model_asset_path="hand_landmarker.task"
)

options = vision.HandLandmarkerOptions(
    base_options=base_options,
    num_hands=1,
    min_hand_detection_confidence=0.7
)

hand_landmarker = vision.HandLandmarker.create_from_options(options)

# ---------------- SCREEN SETUP ----------------
screen_w, screen_h = pyautogui.size()
cap = cv2.VideoCapture(0)

prev_x, prev_y = 0, 0
smoothening = 7
gesture = "None"
pTime = 0

# ---------------- GESTURE PREDICTION ----------------
def predict_gesture(landmarks):
    row = []
    for lm in landmarks:
        row.extend([lm.x, lm.y, lm.z])
    row = np.array(row).reshape(1, -1)
    return model.predict(row)[0]

# ---------------- MAIN LOOP ----------------
while True:
    success, frame = cap.read()
    if not success:
        break

    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = hand_landmarker.detect(mp_image)

    if result.hand_landmarks:
        for hand_landmarks in result.hand_landmarks:

            gesture = predict_gesture(hand_landmarks)

            # Index finger tip (landmark 8)
            raw_x = int(hand_landmarks[8].x * w)
            raw_y = int(hand_landmarks[8].y * h)

            # Smooth cursor
            ix = prev_x + (raw_x - prev_x) / smoothening
            iy = prev_y + (raw_y - prev_y) / smoothening
            prev_x, prev_y = ix, iy
            ix, iy = int(ix), int(iy)

            # ---------------- ACTIONS ----------------
            if gesture == "move":
                screen_x = screen_w * hand_landmarks[8].x
                screen_y = screen_h * hand_landmarks[8].y
                pyautogui.moveTo(screen_x, screen_y)

            elif gesture == "click":
                pyautogui.click()

            elif gesture == "scroll":
                pyautogui.scroll(50)

            # Pointer visualization
            cv2.circle(frame, (ix, iy), 8, (255, 0, 255), -1)

    # ---------------- FPS ----------------
    cTime = time.time()
    fps = 1 / (cTime - pTime) if (cTime - pTime) > 0 else 0
    pTime = cTime

    # ---------------- GUI PANEL ----------------
    cv2.rectangle(frame, (0, 0), (360, 110), (0, 0, 0), -1)
    cv2.putText(frame, "AI Gesture Vision System", (10, 25),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

    cv2.putText(frame, f"Gesture: {gesture}", (10, 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    cv2.putText(frame, f"FPS: {int(fps)}", (10, 85),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

    cv2.imshow("AI Gesture Vision System", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
