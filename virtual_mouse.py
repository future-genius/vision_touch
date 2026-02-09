import cv2
import mediapipe as mp
import pyautogui
import math

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)
mp_draw = mp.solutions.drawing_utils

screen_w, screen_h = pyautogui.size()
cap = cv2.VideoCapture(0)

CLICK_THRESHOLD = 30
pinch_active = False  # To track drag state

def distance(p1, p2):
    return math.hypot(p2[0] - p1[0], p2[1] - p1[1])

while True:
    success, frame = cap.read()
    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    result = hands.process(rgb)

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            h, w, c = frame.shape

            ix = int(hand_landmarks.landmark[8].x * w)
            iy = int(hand_landmarks.landmark[8].y * h)

            tx = int(hand_landmarks.landmark[4].x * w)
            ty = int(hand_landmarks.landmark[4].y * h)

            screen_x = screen_w * hand_landmarks.landmark[8].x
            screen_y = screen_h * hand_landmarks.landmark[8].y
            pyautogui.moveTo(screen_x, screen_y)

            dist = distance((ix, iy), (tx, ty))

            if dist < CLICK_THRESHOLD:
                if not pinch_active:
                    pyautogui.mouseDown()
                    pinch_active = True
                cv2.putText(frame, "DRAG", (ix, iy - 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
            else:
                if pinch_active:
                    pyautogui.mouseUp()
                    pinch_active = False

            mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            cv2.circle(frame, (ix, iy), 10, (255, 0, 255), cv2.FILLED)
            cv2.circle(frame, (tx, ty), 10, (0, 255, 255), cv2.FILLED)

    cv2.imshow("Virtual Mouse", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
