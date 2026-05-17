import os
import json
import numpy as np
from backend.services.db_service import DbService

class GestureDatasetImporter:
    def __init__(self):
        self.dataset_root = r"C:\Users\haran\Downloads\VisionTouch\VisionTouch\dataset"
        self.output_json_path = os.path.join(os.path.dirname(__file__), "gesture_dataset.json")
        self.classes = ["move", "click", "right_click", "scroll", "fist"]

    def import_and_compile(self):
        dataset_samples = []
        print(f"[Importer] Reading custom offline dataset from: {self.dataset_root}")
        
        if not os.path.exists(self.dataset_root):
            print(f"[Importer] ERROR: Dataset directory does not exist at: {self.dataset_root}")
            return []

        for g_class in self.classes:
            class_dir = os.path.join(self.dataset_root, g_class)
            if not os.path.exists(class_dir):
                print(f"[Importer] Warning: Directory for class '{g_class}' not found. Skipping.")
                continue

            files = [f for f in os.listdir(class_dir) if f.endswith(".npy")]
            print(f"[Importer] Found {len(files)} files for class '{g_class}'...")
            
            for file_name in files:
                file_path = os.path.join(class_dir, file_name)
                try:
                    # Load numpy joint coordinate matrix (21, 3)
                    arr = np.load(file_path)
                    if arr.shape != (21, 3):
                        print(f"[Importer] Warning: Invalid shape {arr.shape} in {file_name}. Expected (21, 3).")
                        continue
                        
                    # Format to unified JSON landmark list
                    landmarks = []
                    for joint in arr:
                        landmarks.append({
                            "x": float(joint[0]),
                            "y": float(joint[1]),
                            "z": float(joint[2])
                        })
                        
                    dataset_samples.append({
                        "gesture_key": g_class,
                        "landmarks": landmarks,
                        "quality": 1.0
                    })
                except Exception as e:
                    print(f"[Importer] Error reading {file_name}: {e}")

        # Save to local JSON backup
        with open(self.output_json_path, "w") as f:
            json.dump(dataset_samples, f, indent=4)
            
        print(f"[Importer] Successfully imported {len(dataset_samples)} samples and saved local backup to: {self.output_json_path}")
        return dataset_samples

    def upload_to_supabase(self, dataset_samples):
        db = DbService()
        if not db.client:
            print("[Importer] Supabase local variables offline. Skipping cloud synchronization.")
            return

        print("[Importer] Initializing cloud database synchronization...")
        try:
            # 1. Fetch gesture ID mappings from Supabase
            gestures_res = db.client.table('gestures').select('id, gesture_key').execute()
            g_data = gestures_res.data if hasattr(gestures_res, 'data') else gestures_res
            g_id_map = {item['gesture_key']: item['id'] for item in g_data}
            
            print(f"[Importer] Mapped cloud gesture IDs: {g_id_map}")
            
            # Dynamically seed any missing core gesture records to resolve foreign keys
            for g_key in self.classes:
                if g_key not in g_id_map:
                    print(f"[Importer] Dynamic seeding missing core gesture key '{g_key}' in Supabase...")
                    name_map = {
                        "move": "Pointer Movement (ML)",
                        "click": "Left Mouse Click (ML)",
                        "right_click": "Context Menu Click (ML)",
                        "scroll": "Continuous Scroll (ML)",
                        "fist": "Drag Holding (ML)"
                    }
                    icon_map = {
                        "move": "MousePointer2",
                        "click": "MousePointerClick",
                        "right_click": "CornerDownLeft",
                        "scroll": "ScrollText",
                        "fist": "Grab"
                    }
                    try:
                        ins_res = db.client.table('gestures').insert({
                            "gesture_name": name_map[g_key],
                            "gesture_key": g_key,
                            "gesture_icon": icon_map[g_key],
                            "confidence_threshold": 0.70 if g_key == "click" else 0.65,
                            "enabled_status": True
                        }).execute()
                        ins_data = ins_res.data if hasattr(ins_res, 'data') else ins_res
                        if ins_data:
                            g_id_map[g_key] = ins_data[0]['id']
                            print(f"[Importer] Successfully created gesture '{g_key}' with ID {ins_data[0]['id']}")
                    except Exception as ins_err:
                        print(f"[Importer] Warning: Failed to insert dynamic gesture '{g_key}': {ins_err}")

            # Check if database has already been seeded to avoid duplicates
            res = db.client.table('landmark_dataset').select('dataset_id', count='exact').limit(1).execute()
            count = res.count if hasattr(res, 'count') else len(res.data)
            if count > 200:
                print(f"[Importer] Supabase 'landmark_dataset' table already populated with {count} rows. Skipping upload to avoid duplication.")
                return

            # Prepare records
            records = []
            for sample in dataset_samples:
                g_key = sample["gesture_key"]
                g_id = g_id_map.get(g_key)
                if g_id:
                    records.append({
                        "gesture_id": g_id,
                        "landmark_vectors": sample["landmarks"],
                        "sample_quality": sample["quality"]
                    })

            # Bulk insert in batches of 100 to optimize throughput and network latency
            batch_size = 100
            success_count = 0
            for i in range(0, len(records), batch_size):
                batch = records[i:i+batch_size]
                try:
                    db.client.table('landmark_dataset').insert(batch).execute()
                    success_count += len(batch)
                    print(f"[Importer] Uploaded batch {i//batch_size + 1}: +{len(batch)} samples...")
                except Exception as batch_err:
                    print(f"[Importer] Batch upload error starting index {i}: {batch_err}")

            print(f"[Importer] Database seeding complete! Successfully uploaded {success_count}/{len(records)} landmark samples to Supabase Cloud!")
            
        except Exception as e:
            print(f"[Importer] Error syncing with Supabase: {e}")

def main():
    importer = GestureDatasetImporter()
    samples = importer.import_and_compile()
    if samples:
        importer.upload_to_supabase(samples)

if __name__ == "__main__":
    main()
