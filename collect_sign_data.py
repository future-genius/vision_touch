import cv2
import csv
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

base_options = python.BaseOptions(model_asset_path="hand_landmarker.task")
options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=1)
hand_landmarker = vision.HandLandmarker.create_from_options(options)

cap = cv2.VideoCapture(0)

labels = {
    ord('a'): "A",
    ord('b'): "B",
    ord('c'): "C",
    ord('d'): "D",
    ord('e'): "E",
    ord('f'): "F"
}

with open("sign_language_data.csv", "a", newline="") as f:
    writer = csv.writer(f)

    print("Press keys a,b,c,d,e,f for sign collection")

    while True:
        success, frame = cap.read()
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = hand_landmarker.detect(mp_image)

        key = cv2.waitKey(1)

        if result.hand_landmarks and key in labels:
            for hand_landmarks in result.hand_landmarks:
                row = []
                for lm in hand_landmarks:
                    row.extend([lm.x, lm.y, lm.z])

                row.append(labels[key])
                writer.writerow(row)
                print("Saved:", labels[key])

        cv2.imshow("Collect Sign Language", frame)

        if key == 27:
            break

cap.release()
cv2.destroyAllWindows()
