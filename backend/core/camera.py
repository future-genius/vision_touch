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
        # If camera_index is specified, try only that one
        indices_to_try = [self.camera_index] if self.camera_index is not None else [0, 1]
        
        for index in indices_to_try:
            logger.info(f"Checking camera index {index}...")
            # Try to use CAP_DSHOW on Windows for fast init; fallback if fail
            if os.name == 'nt':
                cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
            else:
                cap = cv2.VideoCapture(index)
                
            if cap is not None and cap.isOpened():
                # Test read
                ret, frame = cap.read()
                if ret and frame is not None:
                    self.cap = cap
                    self.actual_index = index
                    logger.info(f"Verified and opened camera index {index} successfully.")
                    break
                else:
                    cap.release()
                    logger.warning(f"Camera index {index} opened but could not read frame (in-use or invalid).")
            else:
                if cap is not None:
                    cap.release()
                logger.warning(f"Camera index {index} failed to open.")

        if self.cap is None:
            # Clear explanation of error for the user
            err_msg = (
                "\n======================================================================\n"
                "[ERROR] CAMERA UNAVAILABLE!\n"
                "----------------------------------------------------------------------\n"
                "Could not open any active, working camera source (Tried index 0, 1).\n"
                "Please verify that:\n"
                "  1. A physical webcam is connected to your system.\n"
                "  2. No other application (Chrome, Teams, Zoom, etc.) is using the webcam.\n"
                "  3. You have granted app permissions to use the camera in Windows Settings.\n"
                "======================================================================\n"
            )
            logger.error(err_msg)
            raise RuntimeError("Camera unavailable")

        # Configure settings
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self.cap.set(cv2.CAP_PROP_FPS, self.target_fps)
        
        # Query actual width and height to confirm
        actual_w = self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        actual_h = self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        logger.info(f"Webcam resolution configured: {actual_w}x{actual_h} at {self.target_fps} FPS.")

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
