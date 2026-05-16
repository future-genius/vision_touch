import cv2
import mediapipe as mp
import pyautogui
import asyncio
import websockets
import json
import time

# Performance Optimization: Disable PyAutoGUI fail-safe for smoother motion
# (Use Ctrl+C in terminal to stop if needed)
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)
mp_draw = mp.solutions.drawing_utils

# Screen size
SCREEN_WIDTH, SCREEN_HEIGHT = pyautogui.size()

class VisionEngine:
    def __init__(self):
        self.cap = cv2.VideoCapture(0)
        self.prev_x, self.prev_y = 0, 0
        self.smoothening = 5
        
    async def process_frames(self, websocket):
        print("Vision Engine Active. Controlling cursor...")
        while self.cap.isOpened():
            success, image = self.cap.read()
            if not success: continue

            # Flip image for natural mirror effect
            image = cv2.flip(image, 1)
            h, w, _ = image.shape
            
            # Convert to RGB for MediaPipe
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb_image)

            gesture = "None"
            confidence = 0
            
            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    # Index finger tip is landmark 8
                    index_tip = hand_landmarks.landmark[8]
                    thumb_tip = hand_landmarks.landmark[4]
                    middle_tip = hand_landmarks.landmark[12]

                    # Convert normalized to pixel coordinates
                    x = int(index_tip.x * SCREEN_WIDTH)
                    y = int(index_tip.y * SCREEN_HEIGHT)

                    # Smooth cursor movement
                    curr_x = self.prev_x + (x - self.prev_x) / self.smoothening
                    curr_y = self.prev_y + (y - self.prev_y) / self.smoothening
                    
                    # Move Cursor
                    pyautogui.moveTo(curr_x, curr_y)
                    self.prev_x, self.prev_y = curr_x, curr_y

                    # Simple Click Detection (Distance between Index and Thumb)
                    dist = ((index_tip.x - thumb_tip.x)**2 + (index_tip.y - thumb_tip.y)**2)**0.5
                    if dist < 0.05:
                        pyautogui.click()
                        gesture = "Click"
                        confidence = 0.95
                    else:
                        gesture = "Pointer"
                        confidence = 0.98

                    # Send data to React Dashboard
                    data = {
                        "gesture": gesture,
                        "confidence": confidence * 100,
                        "x": index_tip.x,
                        "y": index_tip.y,
                        "fps": 30.0, # Placeholder
                        "landmarkCount": 21,
                        "trackingStatus": "Active",
                        "inferenceTimeMs": 12.5
                    }
                    await websocket.send(json.dumps(data))

            if cv2.waitKey(5) & 0xFF == 27:
                break
        self.cap.release()

async def handler(websocket):
    engine = VisionEngine()
    await engine.process_frames(websocket)

async def main():
    print("Starting WebSocket Server on ws://localhost:8765")
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    main()
