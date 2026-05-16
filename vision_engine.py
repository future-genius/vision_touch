import cv2
import mediapipe as mp
import pyautogui
import asyncio
import websockets
import json
import time
import sys

# Initialize MediaPipe
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5
)

# Screen dimensions
screen_width, screen_height = pyautogui.size()
pyautogui.FAILSAFE = False  # Set to False to prevent script exit on corner move

class VisionEngine:
    def __init__(self):
        self.cap = cv2.VideoCapture(0)
        self.is_running = True

    def get_gesture(self, landmarks):
        try:
            thumb_tip = landmarks[4]
            index_tip = landmarks[8]
            middle_tip = landmarks[12]
            
            dist = ((thumb_tip.x - index_tip.x)**2 + (thumb_tip.y - index_tip.y)**2)**0.5
            
            if dist < 0.05:
                return "Pinch/Click", 95.0
            if index_tip.y < landmarks[6].y and middle_tip.y > landmarks[10].y:
                return "Index Pointer", 98.0
            if index_tip.y < landmarks[6].y and middle_tip.y < landmarks[10].y:
                return "Two Finger Spread", 92.0
            return "Palm Open", 85.0
        except:
            return "None", 0.0

    async def handle_connection(self, websocket):
        print(f"--- Client Connected ---")
        try:
            while self.is_running:
                start_time = time.time()
                success, frame = self.cap.read()
                if not success:
                    await asyncio.sleep(0.1)
                    continue

                frame = cv2.flip(frame, 1)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = hands.process(rgb_frame)

                gesture = "None"
                confidence = 0.0
                landmark_count = 0

                if results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        landmark_count = len(hand_landmarks.landmark)
                        gesture, confidence = self.get_gesture(hand_landmarks.landmark)
                        
                        # Cursor Control
                        index_tip = hand_landmarks.landmark[8]
                        cursor_x = int(index_tip.x * screen_width)
                        cursor_y = int(index_tip.y * screen_height)
                        
                        try:
                            pyautogui.moveTo(cursor_x, cursor_y, _pause=False)
                            if gesture == "Pinch/Click":
                                pyautogui.click()
                        except Exception as e:
                            print(f"Mouse Error: {e}")

                inference_time = (time.time() - start_time) * 1000
                fps = int(1 / (time.time() - start_time)) if (time.time() - start_time) > 0 else 0

                payload = {
                    "gesture": gesture,
                    "confidence": confidence,
                    "fps": fps,
                    "landmarkCount": landmark_count,
                    "inferenceTimeMs": inference_time,
                    "trackingStatus": "Active" if results.multi_hand_landmarks else "Idle"
                }
                
                await websocket.send(json.dumps(payload))
                
                # Prevent CPU Overload
                await asyncio.sleep(0.01)

                # Local Display for Debugging
                cv2.putText(frame, f"FPS: {fps} | {gesture}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.imshow("VisionTouch Stable Engine", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    self.is_running = False
                    break

        except websockets.exceptions.ConnectionClosed:
            print("--- Client Disconnected ---")
        except Exception as e:
            print(f"--- Engine Error: {e} ---")
        finally:
            cv2.destroyAllWindows()

async def main():
    engine = VisionEngine()
    print("Initializing Vision Engine...")
    async with websockets.serve(engine.handle_connection, "localhost", 8765):
        print("STABLE Engine running on ws://localhost:8765")
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nEngine stopped by user.")
        sys.exit(0)
