import os
import json
import random
import numpy as np
from backend.services.db_service import DbService

class GestureDatasetGenerator:
    def __init__(self):
        self.output_path = os.path.join(os.path.dirname(__file__), "gesture_dataset.json")
        self.classes = ["move", "click", "right_click", "scroll", "fist"]
        self.samples_per_class = 30

    def generate_base_hand(self, gesture_class):
        """
        Generates base landmark coordinates (21 joints) for a specific hand shape.
        """
        landmarks = []
        # 0: Wrist
        landmarks.append([0.0, 0.0, 0.0])
        
        # 1-4: Thumb
        if gesture_class == "fist":
            landmarks.extend([[0.04, -0.05, 0.03], [0.07, -0.08, 0.05], [0.09, -0.1, 0.06], [0.08, -0.08, 0.04]])
        elif gesture_class == "click":
            # Pinching toward index tip
            landmarks.extend([[0.06, -0.07, -0.02], [0.10, -0.14, -0.04], [0.11, -0.19, -0.05], [0.10, -0.22, -0.04]])
        else: # move, right_click, scroll
            landmarks.extend([[0.06, -0.07, -0.02], [0.11, -0.12, -0.04], [0.15, -0.15, -0.06], [0.18, -0.17, -0.07]])

        # 5-8: Index Finger
        if gesture_class in ["move", "right_click", "scroll"]:
            # Fully extended
            landmarks.extend([[0.05, -0.18, 0.0], [0.07, -0.32, -0.02], [0.09, -0.42, -0.03], [0.10, -0.52, -0.04]])
        elif gesture_class == "click":
            # Curved down to touch thumb
            landmarks.extend([[0.05, -0.16, 0.0], [0.08, -0.26, -0.03], [0.09, -0.25, -0.04], [0.10, -0.22, -0.04]])
        else: # fist
            # Fully folded
            landmarks.extend([[0.05, -0.14, 0.0], [0.08, -0.10, 0.04], [0.09, -0.07, 0.06], [0.08, -0.05, 0.05]])

        # 9-12: Middle Finger
        if gesture_class in ["right_click", "scroll"]:
            # Fully extended
            landmarks.extend([[0.01, -0.18, 0.0], [0.02, -0.33, -0.02], [0.03, -0.44, -0.03], [0.03, -0.54, -0.04]])
        elif gesture_class in ["move", "click", "fist"]:
            # Folded
            landmarks.extend([[0.01, -0.17, 0.0], [0.02, -0.11, 0.04], [0.03, -0.08, 0.06], [0.03, -0.06, 0.05]])

        # 13-16: Ring Finger
        if gesture_class == "scroll":
            # Fully extended
            landmarks.extend([[-0.03, -0.17, 0.0], [-0.04, -0.31, -0.02], [-0.05, -0.41, -0.03], [-0.06, -0.51, -0.04]])
        else: # move, click, right_click, fist (Folded)
            landmarks.extend([[-0.03, -0.16, 0.0], [-0.04, -0.10, 0.04], [-0.05, -0.07, 0.06], [-0.05, -0.05, 0.05]])

        # 17-20: Pinky Finger
        # Folded in all primary gesture configurations
        landmarks.extend([[-0.07, -0.14, 0.0], [-0.09, -0.09, 0.04], [-0.10, -0.06, 0.06], [-0.10, -0.04, 0.05]])

        return np.array(landmarks)

    def apply_3d_rotations(self, landmarks, rx, ry, rz):
        """
        Applies rotation matrix around X, Y, and Z axes to simulate hand orientation variations.
        """
        # Rotation X
        cx, sx = np.cos(rx), np.sin(rx)
        Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
        
        # Rotation Y
        cy, sy = np.cos(ry), np.sin(ry)
        Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
        
        # Rotation Z
        cz, sz = np.cos(rz), np.sin(rz)
        Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
        
        R = Rz @ Ry @ Rx
        return landmarks @ R.T

    def build_dataset(self):
        dataset = []
        print("[Generator] Compiling biological hand landmark dataset templates...")
        
        for g_class in self.classes:
            for s in range(self.samples_per_class):
                base_pts = self.generate_base_hand(g_class)
                
                # Apply small variations in rotation (tilt up to 15 degrees)
                rx = random.uniform(-0.25, 0.25)
                ry = random.uniform(-0.25, 0.25)
                rz = random.uniform(-0.25, 0.25)
                rotated = self.apply_3d_rotations(base_pts, rx, ry, rz)
                
                # Apply dynamic scaling (simulates distance closer/further)
                scale = random.uniform(0.85, 1.25)
                scaled = rotated * scale
                
                # Add sensor coordinate noise (standard deviation = 0.005)
                noise = np.random.normal(0, 0.005, scaled.shape)
                final_pts = scaled + noise
                
                # Map to standard serialized dictionary list format
                dict_landmarks = []
                for pt in final_pts:
                    dict_landmarks.append({
                        "x": float(pt[0]),
                        "y": float(pt[1]),
                        "z": float(pt[2])
                    })
                
                dataset.append({
                    "gesture_key": g_class,
                    "landmarks": dict_landmarks,
                    "quality": float(random.uniform(0.88, 1.0))
                })
                
        # Save to local file
        with open(self.output_path, "w") as f:
            json.dump(dataset, f, indent=4)
        print(f"[Generator] Successfully compiled and wrote {len(dataset)} samples to: {self.output_path}")
        return dataset

    def seed_database(self, dataset):
        db = DbService()
        if not db.client:
            print("[Generator] Supabase local variables offline. Skipping server upload sync.")
            return
            
        print("[Generator] Uploading dataset samples to Supabase postgres 'landmark_dataset' table...")
        success_count = 0
        
        # Check if table has rows already
        try:
            res = db.client.table('landmark_dataset').select('dataset_id', count='exact').limit(1).execute()
            count = res.count if hasattr(res, 'count') else len(res.data)
            if count > 50:
                print(f"[Generator] Supabase landmark_dataset table already populated with {count} rows. Skipping upload.")
                return
        except Exception:
            pass

        for sample in dataset:
            try:
                success = db.upload_dataset_sample(
                    gesture_key=sample["gesture_key"],
                    landmark_vectors=sample["landmarks"],
                    sample_quality=sample["quality"]
                )
                if success:
                    success_count += 1
            except Exception as e:
                print(f"[Generator] Error seeding sample: {e}")
                
        print(f"[Generator] Finished seeding. Uploaded {success_count}/{len(dataset)} samples to Supabase Cloud!")

def main():
    gen = GestureDatasetGenerator()
    dataset = gen.build_dataset()
    gen.seed_database(dataset)

if __name__ == "__main__":
    main()
