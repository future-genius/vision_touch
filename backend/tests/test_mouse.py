import unittest
import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.core.mouse_controller import MouseController, OneEuroFilter

class TestMouse(unittest.TestCase):
    def test_one_euro_filter_math(self):
        """
        Verify that OneEuroFilter dampens value step-changes smoothly.
        """
        t0 = time.time()
        # Initialize filter at coordinate 100.0
        filt = OneEuroFilter(t0, 100.0, min_cutoff=1.0, beta=0.0)
        
        # Step input to 200.0 after 0.1s
        t1 = t0 + 0.1
        val_filtered = filt(t1, 200.0)
        
        # Output should be smoothed (greater than 100 but strictly less than 200)
        self.assertGreater(val_filtered, 100.0)
        self.assertLess(val_filtered, 200.0)

    def test_mouse_controller_resolution_bounds(self):
        """
        Verify that coordinates mapped from camera space are clamped strictly
        inside screen pixel boundary dimensions.
        """
        ctrl = MouseController()
        # Force a small screen size configuration for testing mapping
        ctrl.screen_width = 1920
        ctrl.screen_height = 1080
        
        # Map extreme coordinates: top-left (0,0) and bottom-right (1,1)
        x1, y1 = ctrl.move_to(0.0, 0.0)
        x2, y2 = ctrl.move_to(1.0, 1.0)
        
        # Check that outputs are clamped correctly within screen coordinates
        self.assertTrue(0 <= x1 < 1920)
        self.assertTrue(0 <= y1 < 1080)
        self.assertTrue(0 <= x2 < 1920)
        self.assertTrue(0 <= y2 < 1080)

if __name__ == '__main__':
    unittest.main()
