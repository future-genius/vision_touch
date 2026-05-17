import pyautogui
import time
from backend.calibration.calibrator import ScreenCalibrator

class CursorController:
    def __init__(self):
        # Prevent PyAutoGUI exceptions on screen corners
        pyautogui.FAILSAFE = False
        
        # Get screen size (supports multiple monitors joined as a single large screen in Windows)
        self.screen_width, self.screen_height = pyautogui.size()
        
        # Instantiate Calibration modular service
        self.calibrator = ScreenCalibrator(self.screen_width, self.screen_height)
        
        # Configuration parameters
        self.sensitivity = 1.6
        self.smoothing = 0.65  # 0 to 1: higher means smoother but slower
        self.dead_zone = 3     # pixel movement threshold to filter out tiny jitters
        self.jitter_window_size = 5
        
        # Calibration bounds (normalized coords to map to screen size)
        # Allows full-screen navigation without needing to reach camera boundaries
        self.calib_x_min = self.calibrator.calib_x_min
        self.calib_x_max = self.calibrator.calib_x_max
        self.calib_y_min = self.calibrator.calib_y_min
        self.calib_y_max = self.calibrator.calib_y_max
        
        # Interactive calibration states
        self.is_calibrating = False
        self.calibration_points = [] # list of (x, y)
        
        # In-memory states
        self.prev_x, self.prev_y = pyautogui.position()
        self.history = []
        self.last_update_time = time.time()

    def set_config(self, sensitivity=None, smoothing=None, dead_zone=None):
        if sensitivity is not None:
            self.sensitivity = sensitivity
        if smoothing is not None:
            self.smoothing = smoothing
        if dead_zone is not None:
            self.dead_zone = dead_zone

    def enter_calibration_mode(self):
        self.calibrator.start_calibration()
        print("Cursor calibration initiated. Point to Top-Left and then Bottom-Right corners.")

    def add_calibration_point(self, norm_x, norm_y):
        success, bounds = self.calibrator.register_point(norm_x, norm_y)
        if success and bounds:
            self.calib_x_min = bounds["x_min"]
            self.calib_x_max = bounds["x_max"]
            self.calib_y_min = bounds["y_min"]
            self.calib_y_max = bounds["y_max"]

    def move_to(self, norm_x, norm_y):
        """
        Maps normalized coordinates to screen with smoothing, dead zone, velocity scaling, and jitter filters.
        """
        # 1. Coordinate is already mirrored horizontally by cv2.flip in main.py, so map directly
        mirrored_x = norm_x
        
        # 2. Coordinate calibration mapping (Clamping & Scaling)
        mapped_x = (mirrored_x - self.calib_x_min) / (self.calib_x_max - self.calib_x_min)
        mapped_y = (norm_y - self.calib_y_min) / (self.calib_y_max - self.calib_y_min)
        
        # Clamp between 0 and 1
        mapped_x = max(0.0, min(1.0, mapped_x))
        mapped_y = max(0.0, min(1.0, mapped_y))
        
        # 3. Scale to screen dimensions
        target_x = int(mapped_x * self.screen_width)
        target_y = int(mapped_y * self.screen_height)
        
        # 4. Jitter Reduction (Moving Average Filter over history)
        self.history.append((target_x, target_y))
        if len(self.history) > self.jitter_window_size:
            self.history.pop(0)
            
        avg_target_x = sum(pt[0] for pt in self.history) / len(self.history)
        avg_target_y = sum(pt[1] for pt in self.history) / len(self.history)
        
        # 5. Adaptive LERP Smoothing & Velocity Acceleration
        now = time.time()
        dt = max(0.001, now - self.last_update_time)
        self.last_update_time = now
        
        dx = avg_target_x - self.prev_x
        dy = avg_target_y - self.prev_y
        dist = (dx**2 + dy**2)**0.5
        
        # Ignore micro-movements within the dead zone to keep cursor steady
        if dist < self.dead_zone:
            return self.prev_x, self.prev_y
            
        # Velocity-based dynamic factor: faster movements get less smoothing (more responsive)
        # Slower movements get high smoothing (extremely precise for clicking)
        velocity = dist / dt
        adaptive_smoothing = self.smoothing
        if velocity > 500: # Fast move
            adaptive_smoothing = max(0.15, self.smoothing * 0.4) # decrease smoothing = snap faster
            
        lerp_factor = 1.0 - adaptive_smoothing
        
        new_x = int(self.prev_x + dx * lerp_factor * self.sensitivity)
        new_y = int(self.prev_y + dy * lerp_factor * self.sensitivity)
        
        # Double clamp to screen constraints
        new_x = max(0, min(self.screen_width - 1, new_x))
        new_y = max(0, min(self.screen_height - 1, new_y))
        
        # Move system cursor
        try:
            pyautogui.moveTo(new_x, new_y, _pause=False)
            self.prev_x, self.prev_y = new_x, new_y
        except Exception as e:
            print(f"PyAutoGUI Move Error: {e}")
            
        return new_x, new_y
