class DatasetManager:
    def __init__(self, db_service=None):
        self.db = db_service
        self.cached_templates = {}

    def validate_sample(self, landmarks):
        """
        Validates landmark sample structure (21 points with x, y, z fields).
        """
        if not landmarks or len(landmarks) != 21:
            return False
        for pt in landmarks:
            if not all(k in pt for k in ('x', 'y', 'z')):
                return False
        return True

    def upload_sample(self, gesture_key, landmarks, confidence):
        if not self.db:
            print("[DatasetManager] Supabase DB service not connected.")
            return False
        
        if not self.validate_sample(landmarks):
            print("[DatasetManager] Landmark sample validation failed.")
            return False

        quality = max(0.5, min(1.0, confidence / 100.0 if confidence > 0 else 0.9))
        
        try:
            success = self.db.upload_dataset_sample(
                gesture_key=gesture_key,
                landmark_vectors=landmarks,
                sample_quality=quality
            )
            if success:
                print(f"[DatasetManager] Successfully uploaded quality landmark template for: {gesture_key}")
            return success
        except Exception as e:
            print(f"[DatasetManager] Error uploading dataset sample: {e}")
            return False
