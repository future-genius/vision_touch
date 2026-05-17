import os
import math
import pickle
import numpy as np

class GestureClassifier:
    def __init__(self):
        self.workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        self.model_path = os.path.join(self.workspace_root, "backend", "models", "gesture_model.pkl")
        self.gesture_thresholds = {} # gesture_key -> threshold float
        self.gesture_names = {
            "move": "Pointer Movement",
            "click": "Trigger Mouse Click",
            "right_click": "Trigger Context Menu",
            "scroll": "Scroll Up/Down",
            "fist": "Drag and Drop Action",
            "None": "Idle State"
        }
        
        self.model_data = None
        self.load_ml_model()

    def load_ml_model(self):
        """
        Dynamically loads the serialized gesture model from disk.
        If it does not exist, automatically bootstrap-trains the pipeline.
        """
        if not os.path.exists(self.model_path):
            print("[Classifier] Serialized ML model not found. Bootstrapping training pipeline...")
            try:
                from backend.datasets.dataset_generator import GestureDatasetGenerator
                # 1. Compile 150-sample high-quality dataset
                gen = GestureDatasetGenerator()
                dataset = gen.build_dataset()
                # Try seeding in background
                try:
                    gen.seed_database(dataset)
                except Exception:
                    pass
                
                # 2. Run Train Pipeline
                from backend.inference.train_pipeline import GestureTrainPipeline
                pipeline = GestureTrainPipeline()
                pipeline.train()
            except Exception as e:
                print(f"[Classifier] Bootstrapping failed: {e}. Falling back to heuristics.")

        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, "rb") as f:
                    self.model_data = pickle.load(f)
                clf_type = self.model_data.get("classifier_type", "Unknown")
                acc = self.model_data.get("accuracy", 0.0)
                print(f"[Classifier] Successfully loaded {clf_type} ML model! Validation Accuracy: {acc*100:.1f}%")
            except Exception as e:
                print(f"[Classifier] Error loading ML model file: {e}")
        else:
            print("[Classifier] Running in heuristic fallback mode.")

    def update_templates(self, mappings, dataset_samples=None):
        """
        Hot-reloads dynamic thresholds and gesture registries.
        """
        self.gesture_thresholds.clear()
        for m in mappings:
            g_key = m.get("gesture_key")
            threshold = m.get("confidence_threshold", 0.7)
            self.gesture_thresholds[g_key] = threshold
            if m.get("gesture_name"):
                self.gesture_names[g_key] = m.get("gesture_name")
        print(f"[Classifier] Mappings thresholds updated successfully: {self.gesture_thresholds}")

    def normalize_landmarks(self, landmarks):
        """
        Translates landmarks relative to wrist (p0) and scales relative to palm size.
        """
        pts = []
        for lm in landmarks:
            if isinstance(lm, dict):
                pts.append([lm['x'], lm['y'], lm['z']])
            else:
                pts.append([lm.x, lm.y, lm.z])
                
        wrist = pts[0]
        translated = [[p[0] - wrist[0], p[1] - wrist[1], p[2] - wrist[2]] for p in pts]
        
        # Palm size: distance from wrist (0) to index finger MCP (5)
        p5 = translated[5]
        palm_size = math.sqrt(p5[0]**2 + p5[1]**2 + p5[2]**2)
        if palm_size == 0:
            palm_size = 1e-5
            
        normalized = [[p[0]/palm_size, p[1]/palm_size, p[2]/palm_size] for p in translated]
        return normalized

    def distance_between(self, p1, p2):
        return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

    def classify(self, landmarks):
        """
        Classifies incoming MediaPipe landmarks using the loaded ML model.
        Falls back to biological geometric heuristics if the model is not trained.
        """
        if not landmarks or len(landmarks) < 21:
            return "None", 0.0

        # --- A. HIGH-PRECISION MACHINE LEARNING PREDICTION (PRIMARY PIPELINE) ---
        if self.model_data:
            try:
                norm_pts = self.normalize_landmarks(landmarks)
                feature_vector = np.array(norm_pts).flatten().reshape(1, -1)
                
                clf_type = self.model_data.get("classifier_type")
                
                if clf_type == "RandomForest":
                    clf = self.model_data["model"]
                    le = self.model_data["label_encoder"]
                    
                    # Predict label
                    pred_idx = clf.predict(feature_vector)[0]
                    predicted_key = le.inverse_transform([pred_idx])[0]
                    
                    # Calculate probability confidence
                    prob = clf.predict_proba(feature_vector)[0]
                    confidence = float(prob[pred_idx] * 100.0)
                    
                    threshold = self.gesture_thresholds.get(predicted_key, 0.65) * 100
                    if confidence >= threshold:
                        return predicted_key, confidence
                        
                elif clf_type == "CentroidKNN":
                    centroids = self.model_data["centroids"]
                    min_dist = float('inf')
                    predicted_key = "None"
                    distances = {}
                    
                    for g_key, centroid_vec in centroids.items():
                        dist = np.linalg.norm(feature_vector.flatten() - centroid_vec)
                        distances[g_key] = dist
                        if dist < min_dist:
                            min_dist = dist
                            predicted_key = g_key
                            
                    # Map distance to confidence percentage using Softmax
                    scale = -12.0 # Temperature scaling parameter
                    exps = {k: math.exp(scale * d) for k, d in distances.items()}
                    total_exp = sum(exps.values())
                    confidence = (exps[predicted_key] / total_exp) * 100.0 if total_exp > 0 else 0.0
                    confidence = max(50.0, min(99.0, confidence))
                    
                    threshold = self.gesture_thresholds.get(predicted_key, 0.60) * 100
                    if confidence >= threshold and min_dist < 0.28:
                        return predicted_key, confidence

            except Exception as e:
                print(f"[Classifier] ML prediction warning: {e}. Falling back to heuristics.")

        # --- B. DOUBLE-REDUNDANT GEOMETRIC HEURISTIC PIPELINE (FAIL-SAFE) ---
        thumb_tip = landmarks[4]
        index_mcp = landmarks[5]
        index_pip = landmarks[6]
        index_tip = landmarks[8]
        middle_pip = landmarks[10]
        middle_tip = landmarks[12]
        ring_pip = landmarks[14]
        ring_tip = landmarks[16]
        pinky_pip = landmarks[18]
        pinky_tip = landmarks[20]

        # Check Click (pinch)
        pinch_dist = self.distance_between(thumb_tip, index_tip)
        if pinch_dist < 0.045:
            return "click", max(60.0, min(99.0, (1.0 - pinch_dist / 0.045) * 100))

        # Check extended fingers
        index_extended = index_tip.y < index_pip.y
        middle_extended = middle_tip.y < middle_pip.y
        ring_extended = ring_tip.y < ring_pip.y
        pinky_extended = pinky_tip.y < pinky_pip.y

        # Pointer Movement (move)
        if index_extended and not middle_extended and not ring_extended and not pinky_extended:
            return "move", 98.0

        # Context Menu (right_click)
        if index_extended and middle_extended and not ring_extended and not pinky_extended:
            # Check proximity for right click selection
            dist_tips = self.distance_between(index_tip, middle_tip)
            if dist_tips < 0.05:
                return "right_click", 95.0

        # Scroll Up/Down (scroll)
        if index_extended and middle_extended and ring_extended and not pinky_extended:
            return "scroll", 92.0

        # Drag and Drop (fist)
        if not index_extended and not middle_extended and not ring_extended and not pinky_extended:
            return "fist", 90.0

        return "None", 0.0
