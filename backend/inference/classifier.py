import math

class GestureClassifier:
    def __init__(self):
        # Memory map of custom templates loaded from DB
        # { gesture_key: [ list of landmark_vectors_templates ] }
        self.templates = {}
        self.gesture_thresholds = {} # gesture_key -> threshold float
        self.gesture_names = {} # gesture_key -> human readable name

    def update_templates(self, mappings, dataset_samples=None):
        """
        Hot-reloads gesture registry templates in-memory.
        """
        self.gesture_thresholds.clear()
        self.gesture_names.clear()
        
        for m in mappings:
            g_key = m.get("gesture_key")
            threshold = m.get("confidence_threshold", 0.7)
            self.gesture_thresholds[g_key] = threshold
            self.gesture_names[g_key] = m.get("gesture_name")

        if dataset_samples:
            self.templates.clear()
            for sample in dataset_samples:
                g_id = sample.get("gesture_id")
                # find key corresponding to this id
                g_key = None
                for m in mappings:
                    if m.get("gesture_id") == g_id:
                        g_key = m.get("gesture_key")
                        break
                        
                if g_key:
                    if g_key not in self.templates:
                        self.templates[g_key] = []
                    
                    vectors = sample.get("landmark_vectors", [])
                    if vectors:
                        norm_vec = self.normalize_landmarks(vectors)
                        self.templates[g_key].append(norm_vec)
                        
            print(f"Loaded custom template vectors for gestures: {list(self.templates.keys())}")

    def normalize_landmarks(self, landmarks):
        """
        Translates landmarks relative to wrist (p0) and scales them relative to palm size
        to ensure scale and translation invariance.
        """
        # Supports both list of dicts {'x', 'y', 'z'} and mediapipe objects
        pts = []
        for lm in landmarks:
            if isinstance(lm, dict):
                pts.append([lm['x'], lm['y'], lm['z']])
            else:
                pts.append([lm.x, lm.y, lm.z])
                
        wrist = pts[0]
        # Translate relative to wrist
        translated = [[p[0] - wrist[0], p[1] - wrist[1], p[2] - wrist[2]] for p in pts]
        
        # Calculate palm size: distance from wrist (0) to index finger MCP (5)
        p5 = translated[5]
        palm_size = math.sqrt(p5[0]**2 + p5[1]**2 + p5[2]**2)
        if palm_size == 0:
            palm_size = 1e-5
            
        # Scale all points
        normalized = [[p[0]/palm_size, p[1]/palm_size, p[2]/palm_size] for p in translated]
        return normalized

    def distance_between(self, p1, p2):
        return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

    def classify(self, landmarks):
        """
        Classifies current hand landmarks and returns (gesture_key, confidence_pct)
        """
        if not landmarks or len(landmarks) < 21:
            return "None", 0.0

        # --- A. HIGH PERFORMANCE GEOMETRIC HEURISTIC (PRIMARY PIPELINE) ---
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

        # 1. Check Pinch/Click (Thumb and Index tips touching)
        pinch_dist = self.distance_between(thumb_tip, index_tip)
        if pinch_dist < 0.045:
            # Check confidence scaling
            confidence = max(60.0, min(99.0, (1.0 - pinch_dist / 0.045) * 100))
            return "pinch_click", confidence

        # 2. Check individual fingers extended statuses
        index_extended = index_tip.y < index_pip.y
        middle_extended = middle_tip.y < middle_pip.y
        ring_extended = ring_tip.y < ring_pip.y
        pinky_extended = pinky_tip.y < pinky_pip.y

        # Index Pointer
        if index_extended and not middle_extended and not ring_extended and not pinky_extended:
            return "index_pointer", 98.0

        # Two Finger Spread
        if index_extended and middle_extended and not ring_extended and not pinky_extended:
            return "two_finger_spread", 95.0

        # Palm Open (All fingers extended)
        if index_extended and middle_extended and ring_extended and pinky_extended:
            return "palm_open", 90.0

        # --- B. DYNAMIC TEMPLATE MATCHING (CUSTOM GESTURE PIPELINE) ---
        if self.templates:
            try:
                curr_norm = self.normalize_landmarks(landmarks)
                best_match_key = None
                min_avg_distance = float('inf')
                
                for g_key, template_list in self.templates.items():
                    for temp in template_list:
                        # Compute Euclidean distance between current hand and template
                        total_dist = 0.0
                        for i in range(1, 21): # Skip wrist (0,0,0)
                            dx = curr_norm[i][0] - temp[i][0]
                            dy = curr_norm[i][1] - temp[i][1]
                            dz = curr_norm[i][2] - temp[i][2]
                            total_dist += math.sqrt(dx**2 + dy**2 + dz**2)
                            
                        avg_dist = total_dist / 20.0
                        if avg_dist < min_avg_distance:
                            min_avg_distance = avg_dist
                            best_match_key = g_key
                
                # Check match threshold (typically average distance < 0.25 is a good match)
                max_allowed_dist = 0.28
                if best_match_key and min_avg_distance < max_allowed_dist:
                    confidence = (1.0 - min_avg_distance / max_allowed_dist) * 100.0
                    confidence = max(50.0, min(99.0, confidence))
                    
                    threshold = self.gesture_thresholds.get(best_match_key, 0.7) * 100
                    if confidence >= threshold:
                        return best_match_key, confidence
            except Exception as e:
                print(f"Template matching error: {e}")

        return "None", 0.0
