import cv2
import os
import time
import threading
import sys
from backend.core.logger import logger

class Camera:
    def __init__(self, camera_index=None, width=640, height=480, target_fps=30):
        self.camera_index = camera_index
        self.width = width
        self.height = height
        self.target_fps = target_fps
        self.cap = None
        self.grabbed = False
        self.frame = None
        self.is_running = False
        self.read_lock = threading.Lock()
        self.thread = None
        self.fps = 0.0
        self.frame_count = 0
        self.last_fps_time = time.time()
        self.actual_index = None

    def initialize(self):
        """
        Attempts to open a camera and set options. Fail-fast if camera is unavailable.
        """
        # If camera_index is specified, try only that one. Otherwise check indices 0 to 4.
        indices_to_try = [self.camera_index] if self.camera_index is not None else [0, 1, 2, 3, 4]
        
        selected_cap = None
        selected_index = None
        backup_cap = None
        backup_index = None
        
        for index in indices_to_try:
            logger.info(f"Checking camera index {index}...")
            if os.name == 'nt':
                cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
            else:
                cap = cv2.VideoCapture(index)
                
            if cap is not None and cap.isOpened():
                # Configure settings BEFORE reading the first frame to avoid renegotiation glitches on Windows
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                cap.set(cv2.CAP_PROP_FPS, self.target_fps)
                
                # Test read
                ret, frame = cap.read()
                if ret and frame is not None:
                    brightness = float(frame.mean())
                    logger.info(f"Camera index {index} opened. Mean brightness: {brightness:.2f}")
                    
                    # If the frame has actual content (not solid black / empty virtual driver)
                    if brightness >= 2.0:
                        selected_cap = cap
                        selected_index = index
                        logger.info(f"Found active physical camera source at index {index}.")
                        break
                    else:
                        # Keep the first opened black camera as a fallback option
                        if backup_cap is None:
                            backup_cap = cap
                            backup_index = index
                            logger.warning(f"Camera index {index} returns black frames; holding as fallback.")
                        else:
                            cap.release()
                else:
                    cap.release()
                    logger.warning(f"Camera index {index} opened but could not read frame (in-use or invalid).")
            else:
                if cap is not None:
                    cap.release()
                logger.warning(f"Camera index {index} failed to open.")

        # Decide which camera source to bind
        if selected_cap is not None:
            self.cap = selected_cap
            self.actual_index = selected_index
            if backup_cap is not None:
                backup_cap.release()
        elif backup_cap is not None:
            self.cap = backup_cap
            self.actual_index = backup_index
            logger.warning(f"No active camera had light; falling back to index {backup_index} (which returned black/empty frames).")
        else:
            self.cap = None

        if self.cap is None:
            # Clear explanation of error for the user
            err_msg = (
                "\n======================================================================\n"
                "[ERROR] CAMERA UNAVAILABLE!\n"
                "----------------------------------------------------------------------\n"
                f"Could not open any active, working camera source (Tried indices {indices_to_try}).\n"
                "Please verify that:\n"
                "  1. A physical webcam is connected to your system.\n"
                "  2. No other application (Chrome, Teams, Zoom, etc.) is using the webcam.\n"
                "  3. You have granted app permissions to use the camera in Windows Settings.\n"
                "======================================================================\n"
            )
            logger.error(err_msg)
            raise RuntimeError("Camera unavailable")

        # Query actual width and height to confirm
        actual_w = self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        actual_h = self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        logger.info(f"Webcam resolution configured: {actual_w}x{actual_h} at {self.target_fps} FPS on camera index {self.actual_index}.")

    def start(self):
        """
        Starts the background threaded video capture loop.
        """
        if self.cap is None:
            self.initialize()
            
        self.is_running = True
        self.grabbed, self.frame = self.cap.read()
        self.thread = threading.Thread(target=self._update, args=())
        self.thread.daemon = True
        self.thread.start()
        logger.info("Threaded camera stream started.")
        return self

    def _update(self):
        """
        Runs on background thread to constantly pull frames from webcam buffer.
        """
        while self.is_running:
            if self.cap and self.cap.isOpened():
                grabbed, frame = self.cap.read()
                if grabbed:
                    with self.read_lock:
                        self.grabbed = grabbed
                        self.frame = frame
                    self._calculate_fps()
                else:
                    time.sleep(0.005)
            else:
                time.sleep(0.01)

    def _calculate_fps(self):
        self.frame_count += 1
        now = time.time()
        elapsed = now - self.last_fps_time
        if elapsed >= 1.0:
            self.fps = self.frame_count / elapsed
            self.frame_count = 0
            self.last_fps_time = now

    def read(self):
        """
        Thread-safe read of the last grabbed frame.
        """
        with self.read_lock:
            if self.frame is not None:
                # Return a copy to avoid multithreading race conditions on frame modifications
                return self.grabbed, self.frame.copy()
            return False, None

    def release(self):
        """
        Stops the capture thread and releases webcam resources.
        """
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=1.0)
            self.thread = None
        if self.cap:
            self.cap.release()
            self.cap = None
        logger.info("Camera resources released.")
