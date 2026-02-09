def fingers_up(hand_landmarks):
    tips = [8, 12, 16, 20]
    fingers = []

    # Thumb
    if hand_landmarks.landmark[4].x < hand_landmarks.landmark[3].x:
        fingers.append(1)
    else:
        fingers.append(0)

    # Other fingers
    for tip in tips:
        if hand_landmarks.landmark[tip].y < hand_landmarks.landmark[tip - 2].y:
            fingers.append(1)
        else:
            fingers.append(0)

    return fingers


def recognize_gesture(fingers):
    # [thumb, index, middle, ring, little]

    if fingers == [0,1,0,0,0]:
        return "MOVE"

    if fingers == [1,1,0,0,0]:
        return "CLICK"

    if fingers == [1,1,1,1,1]:
        return "PAINT_MODE"

    if fingers == [0,0,0,0,0]:
        return "CLEAR"

    if fingers == [0,1,1,0,0]:
        return "SCROLL"

    return "NONE"
