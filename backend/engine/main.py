import cv2
import asyncio
import time
import sys
import os
import threading

# Add parent directory to path to enable modular imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.tracking.hand_tracker import HandTracker
from backend.inference.classifier import GestureClassifier
from backend.inference.clustering import GestureClusterer
from backend.actions.cursor import CursorController
from backend.actions.executor import ActionExecutor
from backend.services.db_service import DbService
from backend.websocket.ws_server import WsServer

class ThreadedVideoCapture:
    def __init__(self, index, cap_api=None):
        import os
        if cap_api is not None:
            self.cap = cv2.VideoCapture(index, cap_api)
        else:
            self.cap = cv2.VideoCapture(index, cv2.CAP_DSHOW) if os.name == 'nt' else cv2.VideoCapture(index)
            
        self.grabbed = False
        self.frame = None
        self.is_running = False
        self.read_lock = threading.Lock()
        
    def start(self):
        if self.cap.isOpened():
            self.grabbed, self.frame = self.cap.read()
            self.is_running = True
            self.thread = threading.Thread(target=self.update, args=())
            self.thread.daemon = True
            self.thread.start()
        return self
        
    def update(self):
        while self.is_running:
            if self.cap.isOpened():
                grabbed, frame = self.cap.read()
                if grabbed:
                    with self.read_lock:
                        self.grabbed = grabbed
                        self.frame = frame
            time.sleep(0.005) # Prevent CPU starvation
            
    def read(self):
        with self.read_lock:
            if self.frame is not None:
                return self.grabbed, self.frame.copy()
            return self.grabbed, None
            
    def isOpened(self):
        return self.cap.isOpened()
        
    def release(self):
        self.is_running = False
        if hasattr(self, 'thread'):
            self.thread.join(timeout=1.0)
        self.cap.release()

class VisionEngine:
    def __init__(self, debug_mode=False):
        self.debug_mode = debug_mode
        self.is_running = False
        self.cap = None
        self.capture_thread = None
        
        # Initialize modular services
        self.tracker = HandTracker()
        self.classifier = GestureClassifier()
        self.clusterer = GestureClusterer()
        self.cursor = CursorController()
        self.executor = ActionExecutor()
        self.db = DbService()
        self.ws = WsServer()
        
        # Bind WebSocket to engine
        self.ws.set_engine(self)
        
        # Registry and state
        self.mappings = []
        self.feed_mode = False
        self.feed_gesture_key = None
        self.last_feed_time = 0
        
        # Initial database reload
        self.reload_registry()

    def reload_registry(self):
        """
        Fetches latest mappings from Supabase or cache, and updates classifier profiles.
        """
        try:
            self.mappings = self.db.fetch_gesture_mappings()
            
            # Fetch labeled templates for custom matching if Supabase is connected
            dataset_samples = []
            if self.db.client:
                try:
                    res = self.db.client.table('landmark_dataset').select('*').execute()
                    dataset_samples = res.data if hasattr(res, 'data') else res
                except Exception as e:
                    print(f"[Engine] Could not fetch landmark dataset templates: {e}")
                    
            self.classifier.update_templates(self.mappings, dataset_samples)
            print(f"[Engine] Hot-reload complete. Loaded {len(self.mappings)} gestures.")
            return True
        except Exception as e:
            print(f"[Engine] Hot-reload error: {e}")
            return False

    def update_cursor_settings(self, sensitivity=None, smoothing=None, dead_zone=None):
        self.cursor.set_config(sensitivity, smoothing, dead_zone)

    def calibrate_coordinate(self, norm_x, norm_y):
        self.cursor.add_calibration_point(norm_x, norm_y)

    def start_feed_mode(self, gesture_key):
        self.feed_gesture_key = gesture_key
        self.feed_mode = True
        self.last_feed_time = 0
        print(f"[Engine] Realtime Feed Mode active for '{gesture_key}'")

    def stop_feed_mode(self):
        self.feed_mode = False
        self.feed_gesture_key = None
        print("[Engine] Realtime Feed Mode stopped")

    def start_capture(self):
        if self.is_running:
            return
            
        print("[Engine] Initializing CV2 camera capture stream...")
        
        # Auto-detect the first working hardware webcam index (0 to 3)
        working_cap = None
        working_index = None
        
        for index in [0, 1, 2, 3]:
            try:
                # Try DirectShow first on Windows for instant response, fall back to default
                cap = cv2.VideoCapture(index, cv2.CAP_DSHOW) if os.name == 'nt' else cv2.VideoCapture(index)
                if cap and cap.isOpened():
                    # Attempt a test frame read to ensure it's not a dummy/virtual/locked device
                    success, test_frame = cap.read()
                    if success and test_frame is not None:
                        print(f"[Engine] Camera index {index} verified successfully! (Frame shape: {test_frame.shape})")
                        working_cap = cap
                        working_index = index
                        break
                    cap.release()
            except Exception as cam_err:
                print(f"[Engine] Testing camera {index} raised warning: {cam_err}")
                
        if not working_cap:
            print("\n[Engine] ❌ ERROR: No active, working webcam could be opened!")
            print("[Engine] Please ensure your web camera is connected, drivers are active, and it is NOT in use by Zoom/Teams/Chrome.\n")
            return
            
        # Release the temporary test capture
        working_cap.release()
        
        # Initialize threaded video capture to bypass OpenCV internal buffer backlog lag
        self.cap = ThreadedVideoCapture(working_index)
        self.cap.start()
        
        self.is_running = True
        # Run capture loop in an independent background thread to keep WebSocket server responsive
        self.capture_thread = threading.Thread(target=self.run_capture_loop)
        self.capture_thread.daemon = True
        self.capture_thread.start()
        print(f"[Engine] Threaded camera stream started successfully on device index {working_index}.")

    def stop_capture(self):
        self.is_running = False
        if self.capture_thread:
            self.capture_thread.join(timeout=2.0)
            self.capture_thread = None
            
        if self.cap:
            self.cap.release()
            self.cap = None
            
        cv2.destroyAllWindows()
        # Ensure any holding actions are released
        self.executor.terminate_continuous_actions()
        print("[Engine] Camera capture stopped and resources released.")

    def run_capture_loop(self):
        """
        Synchronous camera frame processing loop executed inside background thread.
        """
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        fps = 0
        last_time = time.time()
        
        consecutive_failures = 0
        frame_counter = 0
        
        while self.is_running and self.cap:
            start_frame_time = time.time()
            
            # Prof: Read Frame
            success, frame = self.cap.read()
            t_read = (time.time() - start_frame_time) * 1000
            
            if not success or frame is None:
                consecutive_failures += 1
                if consecutive_failures % 150 == 0:
                    print(f"[Engine] ⚠️ Warning: Failed to read frame {consecutive_failures} times. Stream may be stalled.")
                if consecutive_failures > 300:
                    print("[Engine] 🔄 Auto-recovering stalled camera stream...")
                    self.cap.release()
                    time.sleep(0.5)
                    self.cap = ThreadedVideoCapture(0)
                    self.cap.start()
                    consecutive_failures = 0
                time.sleep(0.01)
                continue
            consecutive_failures = 0
            frame_counter += 1

            # Mirror frame for intuitive local control
            frame = cv2.flip(frame, 1)
            
            # Prof: MediaPipe Tracking
            t_track_start = time.time()
            landmarks, tracking_status, raw_landmarks = self.tracker.process_frame(frame)
            t_track = (time.time() - t_track_start) * 1000
            
            gesture_key = "None"
            confidence = 0.0
            cursor_x, cursor_y = self.cursor.prev_x, self.cursor.prev_y
            action_executed_name = "None"
            t_classify = 0.0
            t_action = 0.0
            
            if tracking_status == "Active" and raw_landmarks:
                # Prof: Gesture Prediction (Heuristic + Custom Templates)
                t_classify_start = time.time()
                raw_gesture_key, raw_confidence = self.classifier.classify(raw_landmarks.landmark)
                t_classify = (time.time() - t_classify_start) * 1000

                # --- GESTURE STABILIZATION BUFFER ---
                # Prevent flickering by requiring a gesture to be detected consecutively,
                # or holding the previous gesture if tracking drops for a tiny fraction of a second.
                if not hasattr(self, 'gesture_history'):
                    self.gesture_history = []
                
                self.gesture_history.append(raw_gesture_key)
                if len(self.gesture_history) > 5:  # Look at last 5 frames (~150ms)
                    self.gesture_history.pop(0)

                # Find most common gesture in history
                from collections import Counter
                counter = Counter(self.gesture_history)
                # If the most common is not 'None' and appears at least 2 times, use it.
                # This naturally bridges 1-2 frame drops of "None" while dragging.
                most_common_key, most_common_count = counter.most_common(1)[0]
                
                if most_common_key != 'None' and most_common_count >= 2:
                    gesture_key = most_common_key
                    confidence = raw_confidence if raw_gesture_key == most_common_key else 85.0 # fallback confidence
                else:
                    gesture_key = raw_gesture_key
                    confidence = raw_confidence

                # Fetch corresponding mapping from local registry
                active_mapping = None
                for m in self.mappings:
                    if m.get("gesture_key") == gesture_key:
                        active_mapping = m
                        break
                
                # Always track the index finger tip for cursor coordinate updates
                # this ensures smooth coordinate stream and enables clicking/dragging at active targets!
                index_tip = raw_landmarks.landmark[8]
                
                # Update cursor coordinate smoothly for any hand movements except palm_open (idle)
                if gesture_key != 'palm_open':
                    cursor_x, cursor_y = self.cursor.move_to(index_tip.x, index_tip.y)
                
                # Prof: Action Mapping & Execution
                t_action_start = time.time()
                if active_mapping:
                    action_type = active_mapping.get("action_type")
                    action_params = active_mapping.get("action_parameters", {})
                    sensitivity = active_mapping.get("sensitivity", 1.0)
                    cooldown = active_mapping.get("cooldown", 0.4)
                    action_executed_name = active_mapping.get("action_name", "Action")
                    
                    if action_type == 'move':
                        # If we transitioned from a drag to a move, release the drag
                        self.executor.terminate_continuous_actions()
                    else:
                        # If we are doing something other than drag, terminate any active drags first
                        if action_type != 'drag':
                            self.executor.terminate_continuous_actions()
                            
                        # Standard discrete or continuous execution (Left Click, drag, scroll, keystrokes, shortcuts, etc.)
                        self.executor.execute(
                            action_type=action_type,
                            action_parameters=action_params,
                            cooldown=cooldown,
                            action_name=action_executed_name
                        )
                else:
                    # No active mapped gesture
                    self.executor.terminate_continuous_actions()
                    
                    # 4. Continuous Unknown Gesture Clustering
                    if gesture_key == "None" and raw_gesture_key == "None":
                        try:
                            norm_landmarks = self.classifier.normalize_landmarks(raw_landmarks.landmark)
                            new_pattern = self.clusterer.add_unlabeled_sample(landmarks, norm_landmarks)
                            if new_pattern:
                                # Trigger WebSocket event to notify Admin
                                loop.run_until_complete(self.ws.broadcast({
                                    "type": "detected_unknown_pattern",
                                    "data": new_pattern
                                }))
                        except Exception as e:
                            print(f"[Engine] Clusterer error: {e}")
                t_action = (time.time() - t_action_start) * 1000
                            
                # 5. Labeled Dataset Feeding Mode (1 sample per 300ms limit to prevent database overload)
                if self.feed_mode and self.feed_gesture_key:
                    now_ms = time.time()
                    if now_ms - self.last_feed_time >= 0.3:
                        self.last_feed_time = now_ms
                        # Save in background thread
                        success_upload = self.db.upload_dataset_sample(
                            gesture_key=self.feed_gesture_key,
                            landmark_vectors=landmarks,
                            sample_quality=confidence/100.0 if confidence > 0 else 0.9
                        )
                        if success_upload:
                            loop.run_until_complete(self.ws.broadcast({
                                "type": "dataset_uploaded",
                                "gesture_key": self.feed_gesture_key,
                                "samples_count": 1
                            }))
            else:
                # Hand lost, stop dragging
                self.executor.terminate_continuous_actions()

            # Calculate metrics
            now = time.time()
            fps = int(1.0 / (now - last_time)) if (now - last_time) > 0 else 60
            last_time = now
            inference_time = (time.time() - start_frame_time) * 1000
            
            # Map gesture key to human readable name
            gesture_name = self.classifier.gesture_names.get(gesture_key, gesture_key)

            # Prof: Broadcast Telemetry
            t_broadcast_start = time.time()
            # 6. Stream Live Skeletal Landmarks Telemetry to WebSocket
            payload = {
                "type": "hand_landmarks",
                "data": {
                    "gesture": gesture_name,
                    "gesture_key": gesture_key,
                    "confidence": confidence,
                    "fps": fps,
                    "landmarkCount": len(landmarks),
                    "landmarks": landmarks,
                    "inferenceTimeMs": inference_time,
                    "trackingStatus": tracking_status,
                    "cursorX": cursor_x,
                    "cursorY": cursor_y,
                    "actionState": action_executed_name,
                    "isFeeding": self.feed_mode,
                    "feedGestureKey": self.feed_gesture_key
                }
            }
            loop.run_until_complete(self.ws.broadcast(payload))
            t_broadcast = (time.time() - t_broadcast_start) * 1000

            # Output latency profiling to console every 30 frames under debug mode
            if self.debug_mode and frame_counter % 30 == 0:
                print(f"[Profiler] Loop: {inference_time:.1f}ms | Capture: {t_read:.1f}ms | Tracking: {t_track:.1f}ms | ML: {t_classify:.1f}ms | Action: {t_action:.1f}ms | Broadcast: {t_broadcast:.1f}ms")

            # 7. Local OpenCV Window (only if debug mode is active)
            if self.debug_mode:
                self.tracker.draw_skeleton(frame, raw_landmarks)
                cv2.putText(frame, f"FPS: {fps} | {gesture_name}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.imshow("VisionTouch AI Server Monitor", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    self.is_running = False
                    break
            
            # Prevent thread lock / CPU starvation
            time.sleep(0.005)
            
        loop.close()

async def main():
    # Detect if '--debug' flag is passed
    debug = '--debug' in sys.argv
    engine = VisionEngine(debug_mode=debug)
    
    # Run WebSockets Server
    await engine.ws.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down VisionTouch AI Engine...")
        sys.exit(0)
