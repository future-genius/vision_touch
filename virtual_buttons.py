import cv2
import mediapipe as mp
import math

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)

CLICK_THRESHOLD = 30

def distance(p1, p2):
    return math.hypot(p2[0] - p1[0], p2[1] - p1[1])

def draw_button(frame, text, x, y, w, h):
    cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 3)
    cv2.putText(frame, text, (x+10, y+35),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)

while True:
    success, frame = cap.read()
    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    result = hands.process(rgb)

    # Draw buttons
    draw_button(frame, "PAINT", 50, 50, 150, 60)
    draw_button(frame, "KEYBOARD", 250, 50, 200, 60)
    draw_button(frame, "EXIT", 500, 50, 120, 60)

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            h, w, c = frame.shape

            ix = int(hand_landmarks.landmark[8].x * w)
            iy = int(hand_landmarks.landmark[8].y * h)

            tx = int(hand_landmarks.landmark[4].x * w)
            ty = int(hand_landmarks.landmark[4].y * h)

            dist = distance((ix, iy), (tx, ty))

            cv2.circle(frame, (ix, iy), 10, (255, 0, 255), cv2.FILLED)

            # Check button press with pinch
            if dist < CLICK_THRESHOLD:
                if 50 < ix < 200 and 50 < iy < 110:
                    cv2.putText(frame, "PAINT SELECTED", (50, 150),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)

                if 250 < ix < 450 and 50 < iy < 110:
                    cv2.putText(frame, "KEYBOARD SELECTED", (50, 200),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)

                if 500 < ix < 620 and 50 < iy < 110:
                    cv2.putText(frame, "EXITING...", (50, 250),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
                    cap.release()
                    cv2.destroyAllWindows()
                    exit()

    cv2.imshow("Virtual Buttons", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
