import unittest
import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.core.gesture_engine import GestureEngine
from backend.core.mouse_controller import MouseController

class TestGesture(unittest.TestCase):
    def test_gesture_stabilization_queue(self):
        """
        Verify that majority voting over stabilization queue reduces classification flicker.
        """
        eng = GestureEngine()
        eng.stabilization_frames = 3
        
        # Populate history with noisy flickers
        self.assertEqual(eng.stabilize("OPEN_PALM"), "OPEN_PALM")
        self.assertEqual(eng.stabilize("OPEN_PALM"), "OPEN_PALM")
        
        # Flicker to INDEX_ONLY for 1 frame
        self.assertEqual(eng.stabilize("INDEX_ONLY"), "OPEN_PALM") # Majority remains OPEN_PALM
        
        # Consistent INDEX_ONLY should switch majority
        self.assertEqual(eng.stabilize("INDEX_ONLY"), "INDEX_ONLY")

    def test_gesture_normalization_wrist_translation(self):
        """
        Verify that 21 landmarks preprocessing correctly translates coordinates relative to wrist.
        """
        eng = GestureEngine()
        
        # Construct dummy hand landmarks (all zeros, wrist at x=0.5, y=0.5, z=0.0)
        dummy_landmarks = [{"x": 0.5, "y": 0.5, "z": 0.0}]
        for _ in range(20):
            dummy_landmarks.append({"x": 0.6, "y": 0.6, "z": 0.1})
            
        features = eng.preprocess(dummy_landmarks)
        
        # Confirm normalized dimensions: 21 * 3 = 63
        self.assertEqual(len(features), 63)
        # Wrist index (first 3 features) should be translated to exactly 0.0
        self.assertEqual(features[0], 0.0)
        self.assertEqual(features[1], 0.0)
        self.assertEqual(features[2], 0.0)

if __name__ == '__main__':
    unittest.main()
