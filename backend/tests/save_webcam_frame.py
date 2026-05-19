import cv2
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "Downloads", "Vision Touch")))

from backend.core.camera import Camera

def main():
    print("Opening camera index 0...")
    try:
        # Create a temporary Camera instance with auto-detect
        cam = Camera(camera_index=None, width=640, height=480, target_fps=30)
        cam.start()
        
        # Wait a moment for camera to warm up
        time.sleep(1.0)
        
        grabbed, frame = cam.read()
        if grabbed and frame is not None:
            # Mirror the frame like in main app
            frame = cv2.flip(frame, 1)
            
            # Save frame to workspace root so we can examine it
            save_path = "backend/tests/webcam_test.jpg"
            cv2.imwrite(save_path, frame)
            
            # Calculate brightness and stats
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            mean_brightness = gray.mean()
            print(f"Frame captured successfully!")
            print(f"Dimensions: {frame.shape}")
            print(f"Mean brightness (0-255): {mean_brightness:.2f}")
            print(f"Frame saved to {save_path}")
        else:
            print("Failed to read frame from camera.")
            
        cam.release()
    except Exception as e:
        print(f"Error capturing frame: {e}")

if __name__ == "__main__":
    main()
