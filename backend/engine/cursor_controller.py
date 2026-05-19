import time
import pyautogui
from backend.config import settings
from backend.calibration.calibrator import ScreenCalibrator

class CursorController:
    def __init__(self):
        # Disable Failsafe options to prevent terminal crashing when reaching corners
        pyautogui.FAILSAFE = settings.FAILSAFE
        pyautogui.PAUSE = settings.PAUSE

        # Retrieve main screen resolution
        self.screen_width, self.screen_height = pyautogui.size()

        # Instantiate Calibration modular service
        self.calibrator = ScreenCalibrator(self.screen_width, self.screen_height)

        # Dynamic sensitivity & smoothing parameters
        self.sensitivity = settings.CURSOR_DEFAULT_SENSITIVITY
        self.smoothing = settings.CURSOR_DEFAULT_SMOOTHING
        self.dead_zone = settings.CURSOR_DEFAULT_DEAD_ZONE

        # Calibration borders derived from settings config
        self.calib_x_min = settings.ACTIVE_ZONE_MIN_X
        self.calib_x_max = settings.ACTIVE_ZONE_MAX_X
        self.calib_y_min = settings.ACTIVE_ZONE_MIN_Y
        self.calib_y_max = settings.ACTIVE_ZONE_MAX_Y

        # Adaptive LERP Damping States
        self.prev_x, self.prev_y = pyautogui.position()
        self.history = []
        self.history_window = 6
        self.last_time = time.time()

    def set_config(self, sensitivity=None, smoothing=None, dead_zone=None):
        """
        Hot-updates sensitivity, smoothing factor, or micro-dead-zone parameters.
        """
        if sensitivity is not None:
            self.sensitivity = sensitivity
        if smoothing is not None:
            self.smoothing = smoothing
        if dead_zone is not None:
            self.dead_zone = dead_zone

    def enter_calibration_mode(self):
        self.calibrator.start_calibration()
        print("[Cursor] Screen calibration started. Point hand at top-left, then bottom-right.")

    def add_calibration_point(self, norm_x, norm_y):
        """
        Calculates normalized bounding boxes dynamically.
        """
        success, bounds = self.calibrator.register_point(norm_x, norm_y)
        if success and bounds:
            self.calib_x_min = bounds["x_min"]
            self.calib_x_max = bounds["x_max"]
            self.calib_y_min = bounds["y_min"]
            self.calib_y_max = bounds["y_max"]
            print(f"[Cursor] Recalibrated active zone boundaries: X({self.calib_x_min:.2f}-{self.calib_x_max:.2f}), Y({self.calib_y_min:.2f}-{self.calib_y_max:.2f})")

    def move_to(self, norm_x, norm_y):
        """
        Applies exponential coordinates scaling, moving averages, velocity LERP,
        and pixel-perfect micro damping.
        """
        # 1. Map coordinates within active zone to full viewport
        x_span = max(1e-5, self.calib_x_max - self.calib_x_min)
        y_span = max(1e-5, self.calib_y_max - self.calib_y_min)

        mapped_x = (norm_x - self.calib_x_min) / x_span
        mapped_y = (norm_y - self.calib_y_min) / y_span

        # Clamping
        mapped_x = max(0.0, min(1.0, mapped_x))
        mapped_y = max(0.0, min(1.0, mapped_y))

        # Scale coordinates
        target_x = int(mapped_x * self.screen_width)
        target_y = int(mapped_y * self.screen_height)

        # 2. Moving Average Filter (reduces spatial sensor noise)
        self.history.append((target_x, target_y))
        if len(self.history) > self.history_window:
            self.history.pop(0)
 
        avg_x = sum(pt[0] for pt in self.history) / len(self.history)
        avg_y = sum(pt[1] for pt in self.history) / len(self.history)
 
        # Query the actual physical cursor position on every frame to prevent desync snap-backs
        current_phys_x, current_phys_y = pyautogui.position()
        self.prev_x = current_phys_x
        self.prev_y = current_phys_y
 
        # 3. Dynamic Velocity-LERP Calculation
        now = time.time()
        dt = max(0.001, now - self.last_time)
        self.last_time = now
 
        dx = avg_x - self.prev_x
        dy = avg_y - self.prev_y
        dist = (dx**2 + dy**2)**0.5
 
        # Ignore tiny changes inside deadzone to keep the cursor completely stable
        scaled_deadzone = self.dead_zone * self.screen_width * 0.005
        if dist < scaled_deadzone:
            return self.prev_x, self.prev_y
 
        velocity = dist / dt
 
        # Dynamically scale smoothing factor relative to move speed:
        if velocity < 150:
            adaptive_smoothing = min(0.88, self.smoothing * 1.3)
        elif velocity > 800:
            adaptive_smoothing = max(0.12, self.smoothing * 0.25)
        else:
            factor = (velocity - 150) / 650.0
            adaptive_smoothing = self.smoothing - (self.smoothing * 0.65 * factor)
 
        # Acceleration for faster sweep flicks
        acceleration = 1.0
        if velocity > 1200:
            acceleration = 1.25
 
        # Limit LERP factor to 1.0 to prevent system feedback oscillations/jitter
        lerp_factor = min(1.0, (1.0 - adaptive_smoothing) * self.sensitivity * acceleration)
 
        new_x = int(self.prev_x + dx * lerp_factor)
        new_y = int(self.prev_y + dy * lerp_factor)

        # Re-clamping inside borders
        new_x = max(0, min(self.screen_width - 1, new_x))
        new_y = max(0, min(self.screen_height - 1, new_y))

        # Perform system cursor call
        try:
            import os
            if os.name == 'nt':
                import ctypes
                # Direct hardware-level mouse control bypasses PyAutoGUI UAC permission blocks
                ctypes.windll.user32.SetCursorPos(new_x, new_y)
            else:
                pyautogui.moveTo(new_x, new_y, _pause=False)
            self.prev_x, self.prev_y = new_x, new_y
        except Exception as e:
            try:
                pyautogui.moveTo(new_x, new_y, _pause=False)
                self.prev_x, self.prev_y = new_x, new_y
            except Exception:
                pass

        return new_x, new_y
