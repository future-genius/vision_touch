import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.core.hand_tracker import HandTracker

class TestLandmarks(unittest.TestCase):
    def test_tracker_init(self):
        """
        Verify HandTracker can be instantiated.
        """
        try:
            tracker = HandTracker(max_num_hands=1)
            self.assertIsNotNone(tracker)
        except (FileNotFoundError, ImportError) as e:
            # Gracefully bypass if running on a server environment without MediaPipe or task assets
            self.skipTest(f"MediaPipe assets or libraries missing: {e}")

if __name__ == '__main__':
    unittest.main()
