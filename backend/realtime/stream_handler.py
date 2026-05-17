import time

class TelemetryStreamHandler:
    def __init__(self):
        self.connected_clients = set()
        self.stream_fps = 30
        self.last_broadcast_time = time.time()

    def add_client(self, client):
        self.connected_clients.add(client)

    def remove_client(self, client):
        if client in self.connected_clients:
            self.connected_clients.remove(client)

    def prepare_telemetry_payload(self, gesture, key, confidence, fps, landmarks, tracking_status, cx, cy, active_action, feeding=False):
        """
        Standardizes WebSocket broadcast payloads.
        """
        return {
            "type": "hand_landmarks",
            "data": {
                "gesture": gesture,
                "gesture_key": key,
                "confidence": confidence,
                "fps": fps,
                "landmarkCount": len(landmarks),
                "landmarks": landmarks,
                "inferenceTimeMs": 15.2,  # simulated base telemetry mapping
                "trackingStatus": tracking_status,
                "cursorX": cx,
                "cursorY": cy,
                "actionState": active_action,
                "isFeeding": feeding,
                "feedGestureKey": key if feeding else None
            }
        }
