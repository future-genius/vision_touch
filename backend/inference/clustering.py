import math
import time

class GestureClusterer:
    def __init__(self, min_cluster_size=20, cluster_radius=0.18):
        self.min_cluster_size = min_cluster_size
        self.cluster_radius = cluster_radius
        
        # In-memory candidate clusters
        # [ { 'centroid': [21 points], 'samples': [list of samples], 'last_updated': float } ]
        self.clusters = []
        self.last_detection_time = 0
        self.cooldown = 12.0 # seconds before reminding about a new cluster

    def add_unlabeled_sample(self, raw_landmarks, normalized_landmarks):
        """
        Adds a sample of an unknown gesture pattern and checks if a new cluster is formed.
        Returns a dictionary representing the new cluster centroid if successfully formed, otherwise None.
        """
        now = time.time()
        
        # Throttling candidate additions to 5 Hz to save CPU
        if now - self.last_detection_time < 0.2:
            return None
        self.last_detection_time = now

        matched_cluster = None
        for c in self.clusters:
            # Calculate distance between current sample and cluster centroid
            dist = self.calculate_distance(normalized_landmarks, c['centroid'])
            if dist < self.cluster_radius:
                matched_cluster = c
                break

        if matched_cluster:
            # Add to cluster and update centroid (running average)
            matched_cluster['samples'].append({
                'raw': raw_landmarks,
                'norm': normalized_landmarks
            })
            matched_cluster['last_updated'] = now
            
            # Recalculate centroid
            n_samples = len(matched_cluster['samples'])
            new_centroid = []
            for j in range(21):
                x_sum = sum(s['norm'][j][0] for s in matched_cluster['samples'])
                y_sum = sum(s['norm'][j][1] for s in matched_cluster['samples'])
                z_sum = sum(s['norm'][j][2] for s in matched_cluster['samples'])
                new_centroid.append([x_sum / n_samples, y_sum / n_samples, z_sum / n_samples])
            
            matched_cluster['centroid'] = new_centroid
            
            # Check if cluster is mature and ready to trigger learning notification
            if len(matched_cluster['samples']) == self.min_cluster_size:
                print(f"[Clusterer] New unknown gesture cluster identified with {self.min_cluster_size} stable samples!")
                # Return the mature cluster raw centroid for admin UI display
                centroid_raw = self.reconstruct_raw_centroid(matched_cluster['samples'])
                # Clear mature cluster to avoid duplicate alerts
                self.clusters.remove(matched_cluster)
                return {
                    "landmark_vectors": centroid_raw,
                    "sample_quality": 0.95
                }
        else:
            # Start a new cluster candidate
            self.clusters.append({
                'centroid': normalized_landmarks,
                'samples': [{'raw': raw_landmarks, 'norm': normalized_landmarks}],
                'last_updated': now
            })

        # Cleanup stale clusters (older than 20 seconds with low activity)
        self.clusters = [c for c in self.clusters if now - c['last_updated'] < 20.0]
        
        return None

    def calculate_distance(self, v1, v2):
        total_dist = 0.0
        for i in range(1, 21): # skip wrist
            dx = v1[i][0] - v2[i][0]
            dy = v1[i][1] - v2[i][1]
            dz = v1[i][2] - v2[i][2]
            total_dist += math.sqrt(dx**2 + dy**2 + dz**2)
        return total_dist / 20.0

    def reconstruct_raw_centroid(self, samples):
        """
        Averages the raw coordinate maps to present a clear skeleton to the frontend.
        """
        n = len(samples)
        raw_centroid = []
        for i in range(21):
            x_avg = sum(s['raw'][i]['x'] for s in samples) / n
            y_avg = sum(s['raw'][i]['y'] for s in samples) / n
            z_avg = sum(s['raw'][i]['z'] for s in samples) / n
            raw_centroid.append({"x": x_avg, "y": y_avg, "z": z_avg})
        return raw_centroid
