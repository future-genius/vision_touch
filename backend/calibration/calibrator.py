import numpy as np

class ScreenCalibrator:
    def __init__(self, screen_width=1920, screen_height=1080):
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.calib_x_min = 0.15
        self.calib_x_max = 0.85
        self.calib_y_min = 0.15
        self.calib_y_max = 0.85
        self.calibration_points = []
        self.is_calibrating = False

    def start_calibration(self):
        self.is_calibrating = True
        self.calibration_points = []
        print("[Calibrator] Starting coordinate calibration...")

    def register_point(self, x, y):
        self.is_calibrating = True
        self.calibration_points.append((x, y))
        print(f"[Calibrator] Registered point {len(self.calibration_points)}: ({x:.3f}, {y:.3f})")
        if len(self.calibration_points) >= 2:
            p1, p2 = self.calibration_points[0], self.calibration_points[1]
            self.calib_x_min = min(p1[0], p2[0])
            self.calib_x_max = max(p1[0], p2[0])
            self.calib_y_min = min(p1[1], p2[1])
            self.calib_y_max = max(p1[1], p2[1])
            
            # Enforce safety width margins
            if self.calib_x_max - self.calib_x_min < 0.1:
                self.calib_x_max = self.calib_x_min + 0.1
            if self.calib_y_max - self.calib_y_min < 0.1:
                self.calib_y_max = self.calib_y_min + 0.1
                
            self.is_calibrating = False
            print(f"[Calibrator] Calibration completed successfully! Bounds: X:[{self.calib_x_min:.2f} - {self.calib_x_max:.2f}], Y:[{self.calib_y_min:.2f} - {self.calib_y_max:.2f}]")
            return True, {
                "x_min": self.calib_x_min,
                "x_max": self.calib_x_max,
                "y_min": self.calib_y_min,
                "y_max": self.calib_y_max
            }
        return False, None

    def map_coordinates(self, x, y):
        """
        Maps normalized coordinates to raw screen space based on calibration bounds.
        """
        mapped_x = (x - self.calib_x_min) / (self.calib_x_max - self.calib_x_min)
        mapped_y = (y - self.calib_y_min) / (self.calib_y_max - self.calib_y_min)
        
        # Clamp bounds
        mapped_x = max(0.0, min(1.0, mapped_x))
        mapped_y = max(0.0, min(1.0, mapped_y))
        
        return int(mapped_x * self.screen_width), int(mapped_y * self.screen_height)
