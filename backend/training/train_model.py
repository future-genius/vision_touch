import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from backend.config import settings
from backend.training.collect_dataset import DatasetCompiler
from backend.training.preprocess_dataset import DatasetPreprocessor

class GestureModelTrainer:
    def __init__(self):
        self.model_path = settings.MODEL_PATH
        self.encoder_path = settings.LABEL_ENCODER_PATH

    def train(self):
        """
        Runs the full Machine Learning training loop:
        1. Compiles the raw landmark dataset.
        2. Normalizes features and balances class sizes.
        3. Fits a high-performance RandomForestClassifier.
        4. Serializes the trained model and label encoders.
        """
        print("\n=== [Trainer] Starting AI Gesture Model Training Upgrade ===")

        # 1. Compile CSV Dataset
        compiler = DatasetCompiler()
        success = compiler.compile()
        if not success:
            print("[Trainer] ERROR: Failed to compile CSV dataset. Training halted.")
            return False

        # 2. Preprocess & Balance Landmark Vectors
        preprocessor = DatasetPreprocessor()
        X, y = preprocessor.load_and_preprocess()
        
        if X is None or len(X) == 0:
            print("[Trainer] ERROR: Preprocessed dataset is empty. Training halted.")
            return False

        # 3. Label Encoding
        print("[Trainer] Encoding gesture categories...")
        encoder = LabelEncoder()
        y_encoded = encoder.fit_transform(y)

        # 4. Fit RandomForestClassifier
        # Optimal hyper-parameters: n_estimators=60, max_depth=10, max_features='sqrt'
        # These settings ensure sub-1ms CPU predictions during high-speed real-time capture loops.
        print(f"[Trainer] Fitting production-grade RandomForestClassifier on {X.shape[0]} samples...")
        clf = RandomForestClassifier(
            n_estimators=60,
            max_depth=10,
            random_state=42,
            class_weight="balanced",
            n_jobs=-1 # Parallel training
        )
        clf.fit(X, y_encoded)

        # Calculate base training accuracy
        train_acc = clf.score(X, y_encoded)
        print(f"[Trainer] Model training completed successfully! Base Accuracy: {train_acc * 100.0:.2f}%")

        # 5. Serialize Model & Encoder Checkpoints
        try:
            print(f"[Trainer] Saving model to: {self.model_path}")
            with open(self.model_path, "wb") as f:
                pickle.dump(clf, f)

            print(f"[Trainer] Saving label encoder to: {self.encoder_path}")
            with open(self.encoder_path, "wb") as f:
                pickle.dump(encoder, f)

            print("[Trainer] Checkpoints saved. Dynamic reloading ready.")
            return True
        except Exception as e:
            print(f"[Trainer] ERROR: Failed to write checkpoint files: {e}")
            return False

if __name__ == "__main__":
    trainer = GestureModelTrainer()
    trainer.train()
