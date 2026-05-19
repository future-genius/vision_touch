import time
import os
import math
import pyautogui
from backend.config import settings
from backend.calibration.calibrator import ScreenCalibrator

# High performance direct OS mouse helper
IS_WINDOWS = os.name == 'nt'
if IS_WINDOWS:
    import ctypes
    class POINT(ctypes.Structure):
        _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

    def get_windows_cursor_pos():
        pt = POINT()
        ctypes.windll.user32.GetCursorPos(ctypes.byref(pt))
        return pt.x, pt.y

    def set_windows_cursor_pos(x, y):
        ctypes.windll.user32.SetCursorPos(x, y)
else:
    def get_windows_cursor_pos():
        return pyautogui.position()

    def set_windows_cursor_pos(x, y):
        pyautogui.moveTo(x, y, _pause=False)


class OneEuroFilter:
    def __init__(self, t0, x0, dx0=0.0, min_cutoff=0.6, beta=0.04, d_cutoff=1.0):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.x_prev = x0
        self.dx_prev = dx0
        self.t_prev = t0

    def __call__(self, t, x):
        dt = t - self.t_prev
        if dt <= 0:
            return self.x_prev

        # Filtered velocity
        d_x = (x - self.x_prev) / dt
        alpha_d = self.alpha(dt, self.d_cutoff)
        dx_filtered = alpha_d * d_x + (1 - alpha_d) * self.dx_prev

        # Filtered value with adaptive cutoff
        cutoff = self.min_cutoff + self.beta * abs(dx_filtered)
        alpha = self.alpha(dt, cutoff)
        x_filtered = alpha * x + (1 - alpha) * self.x_prev

        # Save states
        self.x_prev = x_filtered
        self.dx_prev = dx_filtered
        self.t_prev = t

        return x_filtered

    def alpha(self, dt, cutoff):
        tau = 1.0 / (2 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)


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

        # One Euro Filters for X and Y coordinate pipelines
        self.filter_x = None
        self.filter_y = None
        self.last_time = time.time()

        # Keep track of previous coordinates
        self.prev_x, self.prev_y = get_windows_cursor_pos()

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
            
        # Re-initialize filters to adapt to config changes instantly
        self.filter_x = None
        self.filter_y = None

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
            # Clear filter state to prevent coordinate jumping after calibration
            self.filter_x = None
            self.filter_y = None

    def move_to(self, norm_x, norm_y):
        """
        Applies One Euro Filtering, active zone mapping, deadzone scaling,
        and high-speed Win32 coordinate updates.
        """
        now = time.time()
        
        # 1. Map coordinates within active zone to full viewport
        x_span = max(1e-5, self.calib_x_max - self.calib_x_min)
        y_span = max(1e-5, self.calib_y_max - self.calib_y_min)

        mapped_x = (norm_x - self.calib_x_min) / x_span
        mapped_y = (norm_y - self.calib_y_min) / y_span

        # Clamping to screen boundaries [0.0, 1.0]
        mapped_x = max(0.0, min(1.0, mapped_x))
        mapped_y = max(0.0, min(1.0, mapped_y))

        # Scale coordinates to screen resolution
        target_x = mapped_x * self.screen_width
        target_y = mapped_y * self.screen_height

        # 2. Get current cursor position (direct Win32 is ultra-fast)
        current_x, current_y = get_windows_cursor_pos()

        # Initialize filter states if empty
        if self.filter_x is None or self.filter_y is None:
            self.filter_x = OneEuroFilter(now, target_x, min_cutoff=0.6, beta=0.04)
            self.filter_y = OneEuroFilter(now, target_y, min_cutoff=0.6, beta=0.04)
            self.prev_x, self.prev_y = int(target_x), int(target_y)
            set_windows_cursor_pos(self.prev_x, self.prev_y)
            return self.prev_x, self.prev_y

        # Apply One Euro Filtering
        filtered_x = self.filter_x(now, target_x)
        filtered_y = self.filter_y(now, target_y)

        # 3. Dynamic Sensitivity scaling
        # Calculate delta from previous cursor position to see how far we want to move
        dx = filtered_x - current_x
        dy = filtered_y - current_y
        dist = (dx**2 + dy**2)**0.5

        # Ignore tiny changes inside deadzone to keep the cursor completely stable
        scaled_deadzone = self.dead_zone * self.screen_width * 0.005
        if dist < scaled_deadzone:
            return current_x, current_y

        # Apply sensitivity scaling
        new_x = int(current_x + dx * self.sensitivity)
        new_y = int(current_y + dy * self.sensitivity)

        # Re-clamping inside borders
        new_x = max(0, min(self.screen_width - 1, new_x))
        new_y = max(0, min(self.screen_height - 1, new_y))

        # Perform high-performance direct system cursor call
        try:
            set_windows_cursor_pos(new_x, new_y)
            self.prev_x, self.prev_y = new_x, new_y
        except Exception:
            pass

        return new_x, new_y
