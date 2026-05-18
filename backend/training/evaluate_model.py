import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pickle
import numpy as np
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import classification_report, accuracy_score
from backend.config import settings
from backend.training.preprocess_dataset import DatasetPreprocessor

class GestureModelEvaluator:
    def __init__(self):
        self.model_path = settings.MODEL_PATH
        self.encoder_path = settings.LABEL_ENCODER_PATH

    def evaluate(self):
        """
        Loads the preprocessed dataset, performs Stratified 5-Fold Cross-Validation,
        and logs advanced precision, recall, F1, and accuracy analytics.
        """
        print("\n=== [Evaluator] Initiating ML Model Quality Diagnostics ===")

        # 1. Load Preprocessed Data
        preprocessor = DatasetPreprocessor()
        X, y = preprocessor.load_and_preprocess()

        if X is None or len(X) == 0:
            print("[Evaluator] ERROR: Preprocessed dataset is empty. Cannot evaluate.")
            return

        # 2. Check Checkpoints
        if not os.path.exists(self.model_path) or not os.path.exists(self.encoder_path):
            print("[Evaluator] ERROR: Serialized models or label encoders do not exist. Please run training first.")
            return

        # Load checkpoints
        try:
            with open(self.model_path, "rb") as f:
                clf = pickle.load(f)
            with open(self.encoder_path, "rb") as f:
                encoder = pickle.load(f)
            print("[Evaluator] Successfully loaded serialized RandomForest model checkpoint.")
        except Exception as e:
            print(f"[Evaluator] Checkpoint load failed: {e}")
            return

        # 3. Stratified 5-Fold Cross-Validation
        print("[Evaluator] Commencing Stratified 5-Fold Cross-Validation...")
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        
        cv_scores = []
        for fold, (train_idx, val_idx) in enumerate(skf.split(X, y), 1):
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]
            
            fold_clf = clf.__class__(**clf.get_params())
            fold_clf.fit(X_train, y_train)
            
            preds = fold_clf.predict(X_val)
            acc = accuracy_score(y_val, preds)
            cv_scores.append(acc)
            print(f"  - Fold {fold}/5: Accuracy = {acc * 100.0:.2f}%")

        mean_acc = np.mean(cv_scores)
        std_acc = np.std(cv_scores)
        print(f"\n[Evaluator] Cross-Validation Accuracy: {mean_acc * 100.0:.2f}% (± {std_acc * 100.0:.2f}%)")

        # 4. Detailed Classification Metrics (Precision, Recall, F1)
        # Decode integer predictions back to original gesture strings
        y_pred_encoded = clf.predict(X)
        y_pred = encoder.inverse_transform(y_pred_encoded)
        print("\n[Evaluator] Production-Grade Classification Metrics Report:")
        print(classification_report(y, y_pred))

if __name__ == "__main__":
    evaluator = GestureModelEvaluator()
    evaluator.evaluate()
