import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import csv
import json
import numpy as np
from backend.config import settings
from backend.services.db_service import DbService

class DatasetCompiler:
    def __init__(self):
        self.csv_path = settings.CSV_DATASET_PATH
        self.json_path = settings.JSON_DATASET_FALLBACK_PATH
        self.db = DbService()

    def compile(self):
        """
        Pulls raw landmark vectors from Supabase or local JSON backup and compiles them
        into a clean, 64-column CSV format: label, x0, y0, z0, ..., x20, y20, z20.
        """
        print("[DatasetCompiler] Beginning landmark data collection and formatting...")
        samples = []

        # 1. Fetch from Supabase Table
        if self.db.client:
            try:
                print("[DatasetCompiler] Fetching gesture mappings & datasets from Supabase Cloud...")
                gestures_res = self.db.client.table('gestures').select('id, gesture_key').execute()
                g_data = gestures_res.data if hasattr(gestures_res, 'data') else gestures_res
                g_map = {item['id']: item['gesture_key'] for item in g_data}
                
                response = self.db.client.table('landmark_dataset').select('gesture_id, landmark_vectors').execute()
                raw_data = response.data if hasattr(response, 'data') else response
                
                for item in raw_data:
                    g_key = g_map.get(item.get('gesture_id'))
                    landmarks = item.get('landmark_vectors')
                    if g_key and landmarks and len(landmarks) == 21:
                        # Normalize old gesture names to new uppercase ones for strict classification consistency
                        normalized_key = self.map_legacy_gesture_keys(g_key)
                        if normalized_key in settings.ML_CLASSES:
                            samples.append({
                                "label": normalized_key,
                                "landmarks": landmarks
                            })
                print(f"[DatasetCompiler] Fetched {len(samples)} samples from Supabase cloud.")
            except Exception as e:
                print(f"[DatasetCompiler] Supabase fetch skipped: {e}. Falling back to local directories...")

        # 2. Check Local gesture_dataset.json Fallback
        if not samples:
            if not os.path.exists(self.json_path):
                print("[DatasetCompiler] Local JSON dataset not found. Bootstrapping dataset generator...")
                try:
                    from backend.datasets.dataset_generator import GestureDatasetGenerator
                    generator = GestureDatasetGenerator()
                    # Override class types to use ML_CLASSES
                    generator.classes = [k.lower() for k in settings.ML_CLASSES if k != "None"]
                    generator.build_dataset()
                except Exception as e:
                    print(f"[DatasetCompiler] Dataset generator bootstrap failed: {e}")

            if os.path.exists(self.json_path):
                print(f"[DatasetCompiler] Loading landmark coordinates from backup: {self.json_path}")
                with open(self.json_path, "r") as f:
                    raw_samples = json.load(f)
                
                for s in raw_samples:
                    g_key = s.get("gesture_key")
                    landmarks = s.get("landmarks")
                    if g_key and landmarks and len(landmarks) == 21:
                        normalized_key = self.map_legacy_gesture_keys(g_key)
                        if normalized_key in settings.ML_CLASSES:
                            samples.append({
                                "label": normalized_key,
                                "landmarks": landmarks
                            })
                print(f"[DatasetCompiler] Loaded {len(samples)} samples from local JSON backup.")

        if not samples:
            print("[DatasetCompiler] ERROR: Could not retrieve or generate any landmark coordinate templates.")
            return False

        # 3. Compile samples into the new 64-column CSV
        print(f"[DatasetCompiler] Compiling landmark samples into CSV: {self.csv_path} ...")
        
        # Build headers: label, x0, y0, z0, ..., x20, y20, z20
        headers = ["gesture_label"]
        for idx in range(21):
            headers.extend([f"x{idx}", f"y{idx}", f"z{idx}"])

        try:
            with open(self.csv_path, mode="w", newline="") as csv_file:
                writer = csv.writer(csv_file)
                writer.writerow(headers)
                
                row_count = 0
                for sample in samples:
                    label = sample["label"]
                    landmarks = sample["landmarks"]
                    
                    row = [label]
                    for lm in landmarks:
                        # Handle either coordinate objects (dicts) or serialized arrays
                        if isinstance(lm, dict):
                            row.extend([lm.get("x", 0.0), lm.get("y", 0.0), lm.get("z", 0.0)])
                        else:
                            row.extend([lm[0], lm[1], lm[2]])
                            
                    writer.writerow(row)
                    row_count += 1
                    
            print(f"[DatasetCompiler] Success! Formatted and wrote {row_count} samples into: {self.csv_path}")
            return True
        except Exception as e:
            print(f"[DatasetCompiler] File write error: {e}")
            return False

    def map_legacy_gesture_keys(self, key):
        """
        Harmonizes older geometric gesture strings with settings.ML_CLASSES.
        """
        mapping = {
            "move": "OPEN_PALM",
            "index_pointer": "OPEN_PALM",
            "click": "INDEX_ONLY",
            "pinch_click": "INDEX_ONLY",
            "right_click": "INDEX_MIDDLE_JOINED",
            "fist": "FIST",
            "scroll": "THUMB_ONLY",
            "system_gesture": "THUMB_INDEX_MIDDLE"
        }
        # Fallback to direct uppercase matching if already matched
        return mapping.get(key.lower(), key.upper())

if __name__ == "__main__":
    compiler = DatasetCompiler()
    compiler.compile()
