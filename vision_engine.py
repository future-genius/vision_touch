import cv2
import mediapipe as mp
import pyautogui
import asyncio
import websockets
import json
import time

# Initialize MediaPipe
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5
)
mp_draw = mp.solutions.drawing_utils

# Screen dimensions
screen_width, screen_height = pyautogui.size()
pyautogui.FAILSAFE = True

class VisionEngine:
    def __init__(self):
        self.cap = cv2.VideoCapture(0)
        self.is_running = True
        self.current_gesture = "None"
        self.confidence = 0.0
        self.fps = 0
        self.prev_time = 0
        self.landmark_count = 0
        self.inference_time = 0

    def get_gesture(self, landmarks):
        # Basic Gesture Logic
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        middle_tip = landmarks[12]
        
        # Distance between thumb and index
        dist = ((thumb_tip.x - index_tip.x)**2 + (thumb_tip.y - index_tip.y)**2)**0.5
        
        if dist < 0.05:
            return "Pinch/Click", 95.0
        
        if index_tip.y < landmarks[6].y and middle_tip.y > landmarks[10].y:
            return "Index Pointer", 98.0
            
        if index_tip.y < landmarks[6].y and middle_tip.y < landmarks[10].y:
            return "Two Finger Spread", 92.0
            
        return "Palm Open", 85.0

    async def run(self, websocket):
        print(f"Server started. WebSocket Connected.")
        while self.is_running:
            start_time = time.time()
            success, frame = self.cap.read()
            if not success:
                break

            # Flip and Process
            frame = cv2.flip(frame, 1)
            h, w, c = frame.shape
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb_frame)

            self.current_gesture = "None"
            self.confidence = 0.0
            self.landmark_count = 0

            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    self.landmark_count = len(hand_landmarks.landmark)
                    self.current_gesture, self.confidence = self.get_gesture(hand_landmarks.landmark)
                    
                    # Cursor Control (Index Tip)
                    index_tip = hand_landmarks.landmark[8]
                    cursor_x = int(index_tip.x * screen_width)
                    cursor_y = int(index_tip.y * screen_height)
                    
                    # Smooth Move
                    pyautogui.moveTo(cursor_x, cursor_y, duration=0.1)
                    
                    if self.current_gesture == "Pinch/Click":
                        pyautogui.click()

                    # Draw landmarks on frame (Optional, for local debugging)
                    mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

            # Calculate FPS
            self.fps = int(1 / (time.time() - start_time))
            self.inference_time = (time.time() - start_time) * 1000

            # Send Telemetry to Frontend
            payload = {
                "gesture": self.current_gesture,
                "confidence": self.confidence,
                "fps": self.fps,
                "landmarkCount": self.landmark_count,
                "inferenceTimeMs": self.inference_time,
                "trackingStatus": "Active" if results.multi_hand_landmarks else "Idle"
            }
            
            try:
                await websocket.send(json.dumps(payload))
            except websockets.exceptions.ConnectionClosed:
                print("Frontend disconnected.")
                break

            # Local Window (Optional)
            cv2.putText(frame, f"Gesture: {self.current_gesture}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.imshow("VisionTouch Engine v4", frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                self.is_running = False
                break

        self.cap.release()
        cv2.destroyAllWindows()

async def main():
    engine = VisionEngine()
    async with websockets.serve(engine.run, "localhost", 8765):
        print("Vision Engine running on ws://localhost:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
