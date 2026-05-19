import unittest
import os
import sys

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.core.camera import Camera

class TestCamera(unittest.TestCase):
    def test_camera_init_parameters(self):
        """
        Verify that initialization parameters are correctly configured.
        """
        cam = Camera(camera_index=0, width=320, height=240, target_fps=15)
        self.assertEqual(cam.camera_index, 0)
        self.assertEqual(cam.width, 320)
        self.assertEqual(cam.height, 240)
        self.assertEqual(cam.target_fps, 15)
        self.assertFalse(cam.is_running)

    def test_camera_unavailable_error(self):
        """
        Verify that camera raises a RuntimeError if an invalid index is forced.
        """
        # Force an absurdly high camera index that cannot exist
        cam = Camera(camera_index=999, width=640, height=480)
        with self.assertRaises(RuntimeError):
            cam.initialize()

if __name__ == '__main__':
    unittest.main()
