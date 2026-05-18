import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pandas as pd
import numpy as np
from backend.config import settings

class DatasetPreprocessor:
    def __init__(self):
        self.csv_path = settings.CSV_DATASET_PATH

    def load_and_preprocess(self):
        """
        Loads gesture_dataset.csv, filters out corrupted samples, translates landmarks
        relative to the wrist, normalizes by palm scale, and balances the classes.
        """
        if not os.path.exists(self.csv_path):
            print(f"[Preprocessor] ERROR: Dataset CSV file not found at: {self.csv_path}")
            return None, None

        try:
            df = pd.read_csv(self.csv_path)
        except Exception as e:
            print(f"[Preprocessor] Error loading CSV: {e}")
            return None, None

        X_raw = []
        y_raw = []

        print(f"[Preprocessor] Loading raw dataset: {df.shape[0]} total samples.")

        corrupted_count = 0
        for _, row in df.iterrows():
            label = row["gesture_label"]
            coords = row.iloc[1:].values.astype(float)

            # 1. Corrupted Sample Detection
            if len(coords) != 63 or np.isnan(coords).any():
                corrupted_count += 1
                continue

            # Ensure coordinates have standard variation (exclude fully flat dummy rows)
            if np.std(coords) < 0.001:
                corrupted_count += 1
                continue

            # Reshape back to 21 landmarks of (x, y, z) coordinates
            pts = coords.reshape(21, 3)

            # 2. Translate Relative to Wrist (Joint 0)
            wrist = pts[0]
            translated = pts - wrist

            # 3. Palm Size Scaling Normalization (Distance from wrist to index finger MCP - Joint 5)
            p5 = translated[5]
            palm_size = np.linalg.norm(p5)
            
            if palm_size < 1e-4:
                # Discard corrupted sample: distance is too microscopic/flat
                corrupted_count += 1
                continue

            normalized = translated / palm_size

            X_raw.append(normalized.flatten())
            y_raw.append(label)

        if corrupted_count > 0:
            print(f"[Preprocessor] Filtered out {corrupted_count} corrupted or invalid landmark samples.")

        X = np.array(X_raw)
        y = np.array(y_raw)

        if len(X) == 0:
            print("[Preprocessor] Preprocessing failed. No valid features remained.")
            return None, None

        # 4. Balanced Dataset Handling (Oversample smaller gesture classes)
        X_balanced, y_balanced = self.balance_dataset(X, y)
        return X_balanced, y_balanced

    def balance_dataset(self, X, y):
        """
        Ensures perfect balance across all gesture classes by oversampling smaller classes
        and stabilizing model classification.
        """
        unique_classes, counts = np.unique(y, return_counts=True)
        max_count = np.max(counts)

        print("[Preprocessor] Original dataset class distribution:")
        for cls, count in zip(unique_classes, counts):
            print(f"  - {cls}: {count} samples")

        X_balanced = []
        y_balanced = []

        for cls in unique_classes:
            cls_indices = np.where(y == cls)[0]
            cls_X = X[cls_indices]
            
            # Oversample to match max class count
            oversampled_indices = np.random.choice(len(cls_indices), size=max_count, replace=True)
            X_balanced.extend(cls_X[oversampled_indices])
            y_balanced.extend([cls] * max_count)

        X_balanced = np.array(X_balanced)
        y_balanced = np.array(y_balanced)

        print(f"[Preprocessor] Balanced dataset count: {X_balanced.shape[0]} total samples ({max_count} per class).")
        return X_balanced, y_balanced

    @staticmethod
    def normalize_single_hand(landmarks):
        """
        Static helper to normalize a single 21-joint landmark list during real-time inference.
        """
        pts = []
        for lm in landmarks:
            if isinstance(lm, dict):
                pts.append([lm['x'], lm['y'], lm['z']])
            elif hasattr(lm, 'x'):
                pts.append([lm.x, lm.y, lm.z])
            else:
                pts.append([lm[0], lm[1], lm[2]])
                
        pts = np.array(pts)
        wrist = pts[0]
        translated = pts - wrist
        
        p5 = translated[5]
        palm_size = np.linalg.norm(p5)
        if palm_size == 0:
            palm_size = 1e-5
            
        normalized = translated / palm_size
        return normalized.flatten()
