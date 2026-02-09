import cv2
import mediapipe as mp

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)

canvas = None

while True:
    success, frame = cap.read()
    frame = cv2.flip(frame, 1)

    if canvas is None:
        canvas = frame.copy() * 0

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb)

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            h, w, c = frame.shape

            ix = int(hand_landmarks.landmark[8].x * w)
            iy = int(hand_landmarks.landmark[8].y * h)

            tx = int(hand_landmarks.landmark[4].x * w)
            ty = int(hand_landmarks.landmark[4].y * h)

            # If index finger up and thumb far → draw
            if abs(ix - tx) > 40:
                cv2.circle(canvas, (ix, iy), 5, (0, 0, 255), -1)

            mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

    combined = cv2.add(frame, canvas)
    cv2.imshow("Air Canvas", combined)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
