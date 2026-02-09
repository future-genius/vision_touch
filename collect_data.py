import cv2
import mediapipe as mp
import csv

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1)
cap = cv2.VideoCapture(0)

gesture_name = input("Enter gesture name: ")

with open('gesture_data.csv', 'a', newline='') as f:
    writer = csv.writer(f)

    while True:
        ret, frame = cap.read()
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands.process(rgb)

        if result.multi_hand_landmarks:
            for hand_landmarks in result.multi_hand_landmarks:
                row = []
                for lm in hand_landmarks.landmark:
                    row.extend([lm.x, lm.y, lm.z])
                row.append(gesture_name)
                writer.writerow(row)

        cv2.imshow("Collecting Data", frame)

        if cv2.waitKey(1) & 0xFF == 27:
            break

cap.release()
cv2.destroyAllWindows()
