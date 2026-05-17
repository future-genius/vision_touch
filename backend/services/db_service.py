import os
import json
from supabase import create_client, Client

class DbService:
    def __init__(self):
        self.supabase_url = None
        self.supabase_key = None
        self.client = None
        self.cache_path = os.path.join(os.path.dirname(__file__), "gesture_cache.json")
        
        self.load_env()
        self.init_supabase()

    def load_env(self):
        """
        Manually parses the .env file at the project root to load credentials safely.
        """
        try:
            # Look for .env file in parent directories
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            env_path = os.path.join(root_dir, ".env")
            
            if os.path.exists(env_path):
                with open(env_path, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, val = line.split("=", 1)
                            os.environ[key.strip()] = val.strip()

            self.supabase_url = os.getenv("VITE_SUPABASE_URL")
            self.supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")
        except Exception as e:
            print(f"Error loading env variables: {e}")

    def init_supabase(self):
        if self.supabase_url and self.supabase_key:
            try:
                self.client = create_client(self.supabase_url, self.supabase_key)
                print("Supabase client initialized successfully.")
            except Exception as e:
                print(f"Error initializing Supabase client: {e}")
        else:
            print("Supabase credentials not found in env. Falling back to cache.")

    def fetch_gesture_mappings(self):
        """
        Queries gestures, actions, and gesture_action_map from Supabase and joins them.
        Saves a local cache file for offline fallback.
        """
        mappings = []
        if self.client:
            try:
                # Query all active maps with details
                # In Supabase SDK: supabase.table('gesture_action_map').select('*, gestures(*), actions(*)')
                response = self.client.table('gesture_action_map').select(
                    'sensitivity, cooldown, active_status, gesture_id, action_id, gestures(*), actions(*)'
                ).eq('active_status', True).execute()
                
                raw_data = response.data if hasattr(response, 'data') else response
                
                for item in raw_data:
                    gesture = item.get('gestures', {})
                    action = item.get('actions', {})
                    if gesture and action and gesture.get('enabled_status', True):
                        mappings.append({
                            "gesture_id": item.get("gesture_id"),
                            "gesture_name": gesture.get("gesture_name"),
                            "gesture_key": gesture.get("gesture_key"),
                            "gesture_icon": gesture.get("gesture_icon"),
                            "confidence_threshold": gesture.get("confidence_threshold", 0.7),
                            "action_id": item.get("action_id"),
                            "action_name": action.get("action_name"),
                            "action_type": action.get("action_type"),
                            "action_parameters": action.get("action_parameters", {}),
                            "execution_mode": action.get("execution_mode", "instant"),
                            "sensitivity": item.get("sensitivity", 1.0),
                            "cooldown": item.get("cooldown", 0.5)
                        })
                
                # Write to local cache
                if mappings:
                    self.save_local_cache(mappings)
                    print(f"Successfully fetched and cached {len(mappings)} gesture mappings from Supabase.")
                    return mappings
            except Exception as e:
                print(f"Error querying Supabase: {e}. Falling back to cache.")

        # Fallback to local cache
        return self.load_local_cache()

    def save_local_cache(self, mappings):
        try:
            with open(self.cache_path, "w") as f:
                json.dump(mappings, f, indent=4)
        except Exception as e:
            print(f"Error saving local cache: {e}")

    def load_local_cache(self):
        try:
            if os.path.exists(self.cache_path):
                with open(self.cache_path, "r") as f:
                    mappings = json.load(f)
                    print(f"Loaded {len(mappings)} gesture mappings from local cache.")
                    return mappings
        except Exception as e:
            print(f"Error loading local cache: {e}")
        
        # Default fallback mappings if cache doesn't exist
        print("No cache found. Using factory default mappings.")
        return [
            {
                "gesture_name": "Index Pointer",
                "gesture_key": "index_pointer",
                "confidence_threshold": 0.65,
                "action_type": "move",
                "action_parameters": {},
                "execution_mode": "continuous",
                "sensitivity": 1.5,
                "cooldown": 0.1
            },
            {
                "gesture_name": "Pinch / Click",
                "gesture_key": "pinch_click",
                "confidence_threshold": 0.70,
                "action_type": "left_click",
                "action_parameters": {},
                "execution_mode": "instant",
                "sensitivity": 1.0,
                "cooldown": 0.4
            },
            {
                "gesture_name": "Two Finger Spread",
                "gesture_key": "two_finger_spread",
                "confidence_threshold": 0.60,
                "action_type": "drag",
                "action_parameters": {},
                "execution_mode": "continuous",
                "sensitivity": 1.2,
                "cooldown": 0.3
            }
        ]

    def upload_dataset_sample(self, gesture_key, landmark_vectors, sample_quality=1.0):
        """
        Uploads a labeled landmark sample vector to landmark_dataset table.
        """
        if not self.client:
            print("Supabase client not initialized. Cannot upload landmark dataset.")
            return False
            
        try:
            # Find gesture_id by key
            response = self.client.table('gestures').select('id').eq('gesture_key', gesture_key).execute()
            data = response.data if hasattr(response, 'data') else response
            
            gesture_id = data[0]['id'] if data else None
            
            insert_data = {
                "landmark_vectors": landmark_vectors,
                "sample_quality": sample_quality
            }
            if gesture_id:
                insert_data["gesture_id"] = gesture_id

            self.client.table('landmark_dataset').insert([insert_data]).execute()
            return True
        except Exception as e:
            print(f"Error uploading landmark sample: {e}")
            return False
