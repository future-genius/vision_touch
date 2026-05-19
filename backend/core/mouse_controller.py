import os
import time
import math
import pyautogui
from backend.core.logger import logger
from backend.core.utils import config, IS_WINDOWS

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

    # Win32 Mouse Events
    MOUSEEVENTF_LEFTDOWN = 0x0002
    MOUSEEVENTF_LEFTUP = 0x0004
    MOUSEEVENTF_RIGHTDOWN = 0x0008
    MOUSEEVENTF_RIGHTUP = 0x0010
    MOUSEEVENTF_WHEEL = 0x0800
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
        alpha_d = self._alpha(dt, self.d_cutoff)
        dx_filtered = alpha_d * d_x + (1 - alpha_d) * self.dx_prev

        # Filtered value with adaptive cutoff
        cutoff = self.min_cutoff + self.beta * abs(dx_filtered)
        alpha = self._alpha(dt, cutoff)
        x_filtered = alpha * x + (1 - alpha) * self.x_prev

        # Save states
        self.x_prev = x_filtered
        self.dx_prev = dx_filtered
        self.t_prev = t

        return x_filtered

    def _alpha(self, dt, cutoff):
        tau = 1.0 / (2 * math.pi * cutoff)
        return 1.0 / (1.0 + (tau / dt))


class MouseController:
    def __init__(self):
        # Override PyAutoGUI defaults to achieve zero-latency responses
        pyautogui.FAILSAFE = False
        pyautogui.PAUSE = 0.0

        # Retrieve primary screen resolution
        self.screen_width, self.screen_height = pyautogui.size()
        logger.info(f"Screen resolution detected: {self.screen_width}x{self.screen_height}")

        # Config parameters
        cur_conf = config.get("cursor", {})
        az_conf = config.get("active_zone", {})
        
        self.sensitivity = cur_conf.get("sensitivity", 1.8)
        self.smoothing = cur_conf.get("smoothing", 0.50)
        self.dead_zone = cur_conf.get("dead_zone", 0.02)
        self.screen_scale = cur_conf.get("screen_scale", 1.0)
        
        # One Euro filter params
        oe_conf = cur_conf.get("one_euro", {})
        self.oe_min_cutoff = oe_conf.get("min_cutoff", 0.6)
        self.oe_beta = oe_conf.get("beta", 0.04)
        self.oe_d_cutoff = oe_conf.get("d_cutoff", 1.0)

        # Base active zone coordinates
        self.base_min_x = az_conf.get("min_x", 0.30)
        self.base_max_x = az_conf.get("max_x", 0.70)
        self.base_min_y = az_conf.get("min_y", 0.25)
        self.base_max_y = az_conf.get("max_y", 0.65)

        # Filters
        self.filter_x = None
        self.filter_y = None

        # Drag state tracker
        self.is_dragging = False

        # Previous position
        self.prev_x, self.prev_y = get_windows_cursor_pos()

    def set_config(self, sensitivity=None, smoothing=None, dead_zone=None):
        if sensitivity is not None:
            self.sensitivity = sensitivity
        if smoothing is not None:
            self.smoothing = smoothing
            # Adjust one-euro filter min_cutoff based on smoothing parameter (0.01 - 2.0 range)
            self.oe_min_cutoff = max(0.01, 1.2 - smoothing)
        if dead_zone is not None:
            self.dead_zone = dead_zone
        
        # Clear filter to apply changes instantly
        self.filter_x = None
        self.filter_y = None
        logger.info(f"Cursor parameters updated: sensitivity={self.sensitivity}, smoothing={self.smoothing}, dead_zone={self.dead_zone}")

    def move_to(self, norm_x, norm_y):
        """
        Maps normalized joint coordinate (norm_x, norm_y) from camera frame
        to OS screen coordinates using OneEuroFilter, deadzones, and sensitivity.
        """
        now = time.time()

        # 1. Compute dynamic active zone borders based on sensitivity
        # High sensitivity shrinks the active area, causing mouse to travel further
        center_x = (self.base_min_x + self.base_max_x) / 2.0
        center_y = (self.base_min_y + self.base_max_y) / 2.0
        
        half_span_x = ((self.base_max_x - self.base_min_x) / 2.0) / self.sensitivity
        half_span_y = ((self.base_max_y - self.base_min_y) / 2.0) / self.sensitivity

        min_x = center_x - half_span_x
        max_x = center_x + half_span_x
        min_y = center_y - half_span_y
        max_y = center_y + half_span_y

        x_span = max(1e-5, max_x - min_x)
        y_span = max(1e-5, max_y - min_y)

        # Map to [0.0, 1.0] and clamp
        mapped_x = max(0.0, min(1.0, (norm_x - min_x) / x_span))
        mapped_y = max(0.0, min(1.0, (norm_y - min_y) / y_span))

        # Scale to screen pixel space
        target_x = mapped_x * self.screen_width * self.screen_scale
        target_y = mapped_y * self.screen_height * self.screen_scale

        # Clamp target coords within screen resolution
        target_x = max(0.0, min(self.screen_width - 1, target_x))
        target_y = max(0.0, min(self.screen_height - 1, target_y))

        # Get current mouse coordinates
        current_x, current_y = get_windows_cursor_pos()

        # 2. Setup/Apply OneEuro Filter
        if self.filter_x is None or self.filter_y is None:
            self.filter_x = OneEuroFilter(now, target_x, min_cutoff=self.oe_min_cutoff, beta=self.oe_beta, d_cutoff=self.oe_d_cutoff)
            self.filter_y = OneEuroFilter(now, target_y, min_cutoff=self.oe_min_cutoff, beta=self.oe_beta, d_cutoff=self.oe_d_cutoff)
            self.prev_x, self.prev_y = int(target_x), int(target_y)
            set_windows_cursor_pos(self.prev_x, self.prev_y)
            return self.prev_x, self.prev_y

        filtered_x = self.filter_x(now, target_x)
        filtered_y = self.filter_y(now, target_y)

        # 3. Apply Dead-Zone filtering to filter out tiny hand vibrations
        dx = filtered_x - current_x
        dy = filtered_y - current_y
        distance = math.sqrt(dx * dx + dy * dy)

        # Compute dynamic deadzone radius (percentage of screen width)
        deadzone_radius = self.dead_zone * self.screen_width * 0.5
        if distance < deadzone_radius:
            return current_x, current_y

        new_x = int(filtered_x)
        new_y = int(filtered_y)

        # Double safety bounds clamp
        new_x = max(0, min(self.screen_width - 1, new_x))
        new_y = max(0, min(self.screen_height - 1, new_y))

        # Update OS cursor position
        try:
            set_windows_cursor_pos(new_x, new_y)
            self.prev_x, self.prev_y = new_x, new_y
        except Exception as e:
            logger.error(f"Failed to update system mouse cursor: {e}")

        return new_x, new_y

    def left_click(self):
        """
        Executes a single left-click action.
        """
        if IS_WINDOWS:
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
        else:
            pyautogui.click()
        logger.debug("Action: Left Click")

    def right_click(self):
        """
        Executes a single right-click action.
        """
        if IS_WINDOWS:
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
        else:
            pyautogui.click(button='right')
        logger.debug("Action: Right Click")

    def double_click(self):
        """
        Executes a double left-click action.
        """
        if IS_WINDOWS:
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            time.sleep(0.05)
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
        else:
            pyautogui.doubleClick()
        logger.debug("Action: Double Click")

    def scroll(self, direction="down", amount=1):
        """
        Executes a scroll action.
        """
        scroll_val = amount * 120 if direction == "up" else -amount * 120
        if IS_WINDOWS:
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, scroll_val, 0)
        else:
            pyautogui.scroll(scroll_val)
        logger.debug(f"Action: Scroll {direction} ({scroll_val})")

    def start_drag(self):
        """
        Transitions into drag mode (Left mouse button down).
        """
        if not self.is_dragging:
            if IS_WINDOWS:
                ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            else:
                pyautogui.mouseDown()
            self.is_dragging = True
            logger.debug("Action: Drag Start")

    def stop_drag(self):
        """
        Releases drag mode (Left mouse button up).
        """
        if self.is_dragging:
            if IS_WINDOWS:
                ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            else:
                pyautogui.mouseUp()
            self.is_dragging = False
            logger.debug("Action: Drag Stop")

    def release_all(self):
        """
        Failsafe reset to release mouse buttons.
        """
        self.stop_drag()
