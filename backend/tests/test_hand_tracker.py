import sys
import os
import time
import cv2

# Set path context
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.camera import Camera
from backend.core.hand_tracker import HandTracker

def run_test():
    print("Initializing HandTracker...")
    try:
        tracker = HandTracker()
    except Exception as e:
        print(f"Failed to initialize HandTracker: {e}")
        return

    print("Initializing Camera (auto-detection mode)...")
    try:
        camera = Camera(camera_index=None, width=640, height=480, target_fps=30)
        camera.start()
        print(f"Camera started on index {camera.camera_index}")
    except Exception as e:
        print(f"Failed to initialize Camera: {e}")
        return

    print("Starting frame processing loop (runs for 10 seconds). Place your hand in front of the camera...")
    start_time = time.time()
    frames_processed = 0
    hands_detected = 0

    try:
        while time.time() - start_time < 10.0:
            grabbed, frame = camera.read()
            if not grabbed or frame is None:
                time.sleep(0.005)
                continue

            frames_processed += 1
            landmarks, status, raw = tracker.process_frame(frame)
            
            if status == "Active":
                hands_detected += 1
                # Print index finger tip (landmark 8) and wrist (landmark 0)
                wrist = landmarks[0]
                index_tip = landmarks[8]
                print(f"[Frame {frames_processed}] Hand Detected! Wrist: ({wrist['x']:.3f}, {wrist['y']:.3f}), Index Tip: ({index_tip['x']:.3f}, {index_tip['y']:.3f})")
            else:
                if frames_processed % 30 == 0:
                    print(f"[Frame {frames_processed}] No hand detected (Status: {status})")

            time.sleep(0.01)

    except KeyboardInterrupt:
        print("Test stopped by user.")
    finally:
        print("\n=== Test Results ===")
        print(f"Total frames processed: {frames_processed}")
        print(f"Frames with hand detected: {hands_detected} ({hands_detected/max(1, frames_processed)*100:.1f}%)")
        camera.release()
        print("Camera released.")

if __name__ == "__main__":
    run_test()
