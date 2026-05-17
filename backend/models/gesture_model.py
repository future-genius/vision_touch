class GestureModelConfig:
    def __init__(self):
        self.model_name = "MediaPipe ResNet50 (Heuristic + Centroid Distance KNN)"
        self.min_detection_confidence = 0.75
        self.min_tracking_confidence = 0.80
        
        # Hardened thresholds for dynamic classification
        self.category_thresholds = {
            "Clicks": 0.65,
            "Cursor": 0.70,
            "Shortcuts": 0.65,
            "Custom": 0.60
        }

    def get_threshold_for_gesture(self, gesture_key, category="Custom"):
        """
        Retrieves confidence thresholds.
        """
        return self.category_thresholds.get(category, 0.60)
