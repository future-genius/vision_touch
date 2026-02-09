import cv2
import mediapipe as mp
import math

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)
CLICK_THRESHOLD = 30

mode = "MENU"
canvas = None

def distance(p1, p2):
    return math.hypot(p2[0] - p1[0], p2[1] - p1[1])

def draw_button(frame, text, x, y, w, h):
    cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 3)
    cv2.putText(frame, text, (x+10, y+35),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)

while True:
    success, frame = cap.read()
    frame = cv2.flip(frame, 1)

    if canvas is None:
        canvas = frame.copy() * 0

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb)

    if mode == "MENU":
        draw_button(frame, "PAINT", 50, 50, 150, 60)
        draw_button(frame, "EXIT", 250, 50, 150, 60)

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            h, w, c = frame.shape

            ix = int(hand_landmarks.landmark[8].x * w)
            iy = int(hand_landmarks.landmark[8].y * h)
            tx = int(hand_landmarks.landmark[4].x * w)
            ty = int(hand_landmarks.landmark[4].y * h)

            dist = distance((ix, iy), (tx, ty))

            cv2.circle(frame, (ix, iy), 10, (255, 0, 255), cv2.FILLED)

            # MENU interactions
            if mode == "MENU" and dist < CLICK_THRESHOLD:
                if 50 < ix < 200 and 50 < iy < 110:
                    mode = "PAINT"
                if 250 < ix < 400 and 50 < iy < 110:
                    break

            # PAINT mode
            if mode == "PAINT":
                if abs(ix - tx) > 40:
                    cv2.circle(canvas, (ix, iy), 5, (0, 0, 255), -1)

    if mode == "PAINT":
        frame = cv2.add(frame, canvas)

    cv2.imshow("AI Virtual Touch System", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
