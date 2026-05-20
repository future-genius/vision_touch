import os
import sys
import argparse
import time
import cv2
import asyncio
import json
import websockets
import threading

# Remove local script directory from sys.path to prevent name collisions (e.g. backend/realtime vs pip realtime)
script_dir = os.path.abspath(os.path.dirname(__file__))
if script_dir in sys.path:
    sys.path.remove(script_dir)

# Add workspace root at the beginning of the path
workspace_root = os.path.abspath(os.path.join(script_dir, ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

from backend.core.logger import logger
from backend.core.utils import config, IS_WINDOWS, map_legacy_gesture_keys, MODEL_PATH, LABEL_ENCODER_PATH
from backend.core.camera import Camera
from backend.core.hand_tracker import HandTracker
from backend.core.mouse_controller import MouseController
from backend.core.gesture_engine import GestureEngine
from backend.core.ui_overlay import UIOverlay
from backend.core.pose_head_tracker import PoseHeadTracker
from backend.core.multimodal_fusion import MultimodalFusion
from backend.core.context_engine import ContextEngine
from backend.core.voice_engine import VoiceWelcomeEngine

# Asynchronous DB service and training imports for WebSockets mode
from backend.services.db_service import DbService

class WebSocketServer:
    def __init__(self, host, port, engine_runner):
        self.host = host
        self.port = port
        self.runner = engine_runner
        self.clients = set()
        self.loop = None

    async def register(self, websocket):
        self.clients.add(websocket)
        logger.info(f"Client connected: {websocket.remote_address}. Total active: {len(self.clients)}")
        try:
            await websocket.send(json.dumps({
                "type": "user_connected",
                "message": "Connected to VisionTouch Realtime AI Server node.",
                "active_clients": len(self.clients)
            }))
        except Exception:
            pass

    async def unregister(self, websocket):
        self.clients.discard(websocket)
        logger.info(f"Client disconnected: {websocket.remote_address}. Total active: {len(self.clients)}")

    async def broadcast(self, message_str):
        if not self.clients:
            return
        disconnected = []
        for client in list(self.clients):
            try:
                await client.send(message_str)
            except Exception:
                disconnected.append(client)
        for client in disconnected:
            await self.unregister(client)

    async def handle_message(self, websocket, path=None):
        await self.register(websocket)
        try:
            async for message in websocket:
                try:
                    event = json.loads(message)
                    event_type = event.get("type")
                    data = event.get("data", {})
                    logger.info(f"WebSocket event received: '{event_type}'")

                    if event_type == "initialize_engine":
                        self.runner.start_capture()
                        await websocket.send(json.dumps({
                            "type": "admin_notification",
                            "message": "Vision Neural Engine Initialized Successfully.",
                            "status": "Active"
                        }))

                    elif event_type == "disconnect_engine":
                        self.runner.stop_capture()
                        await websocket.send(json.dumps({
                            "type": "admin_notification",
                            "message": "Vision Neural Engine Standby.",
                            "status": "Idle"
                        }))

                    elif event_type == "hot_reload":
                        success = self.runner.reload_registry()
                        await self.broadcast(json.dumps({
                            "type": "inference_updated",
                            "message": "Active gesture mappings hot-reloaded globally.",
                            "success": success
                        }))

                    elif event_type == "retrain_model":
                        try:
                            from backend.training.train_model import GestureModelTrainer
                            trainer = GestureModelTrainer()
                            success = trainer.train()

                            if success:
                                self.runner.gesture_engine.load_model()
                                self.runner.reload_registry()

                            await self.broadcast(json.dumps({
                                "type": "inference_updated",
                                "message": "AI Gesture model retrained and hot-loaded successfully!",
                                "success": success
                            }))
                        except Exception as e:
                            logger.error(f"Retraining error: {e}")
                            await websocket.send(json.dumps({
                                "type": "admin_notification",
                                "message": f"Retraining failed: {str(e)}",
                                "success": False
                            }))

                    elif event_type == "start_feeding":
                        g_key = data.get("gesture_key")
                        if g_key:
                            self.runner.start_feeding(g_key)
                            await websocket.send(json.dumps({
                                "type": "admin_notification",
                                "message": f"Started feeding training landmarks for '{g_key}'",
                                "gesture_key": g_key
                            }))

                    elif event_type == "stop_feeding":
                        self.runner.stop_feeding()
                        await websocket.send(json.dumps({
                            "type": "admin_notification",
                            "message": "Landmarks feeding stopped."
                        }))

                    elif event_type == "calibrate_point":
                        point_type = data.get("point") # 'top_left' or 'bottom_right'
                        norm_x = data.get("x")
                        norm_y = data.get("y")
                        if norm_x is not None and norm_y is not None:
                            self.runner.calibrate_point(point_type, norm_x, norm_y)
                            await websocket.send(json.dumps({
                                "type": "calibration_updated",
                                "message": f"Calibration coordinate captured: {point_type}"
                            }))

                    elif event_type == "set_cursor_config":
                        sens = data.get("sensitivity")
                        smooth = data.get("smoothing")
                        dead = data.get("dead_zone")
                        self.runner.mouse_controller.set_config(sens, smooth, dead)
                        await websocket.send(json.dumps({
                            "type": "admin_notification",
                            "message": "Cursor calibration settings updated successfully"
                        }))

                    elif event_type == "ping":
                        await websocket.send(json.dumps({"type": "pong", "timestamp": time.time()}))

                except json.JSONDecodeError:
                    logger.warning("Received non-JSON payload.")
                except Exception as e:
                    logger.error(f"Error processing websocket event: {e}")

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister(websocket)

    async def start(self):
        self.loop = asyncio.get_running_loop()
        logger.info(f"Starting WebSocket server on ws://{self.host}:{self.port} ...")
        async with websockets.serve(self.handle_message, self.host, self.port):
            await asyncio.Future()  # run forever


class EngineRunner:
    def __init__(self):
        self.camera = None
        self.hand_tracker = None
        self.mouse_controller = None
        self.gesture_engine = None
        self.ui_overlay = UIOverlay()
        
        # Multimodal and Context components
        self.pose_head_tracker = None
        self.multimodal_fusion = None
        self.context_engine = None
        self.voice_engine = None
        
        self.db = DbService()
        self.is_running = False
        self.capture_thread = None
        
        self.ws_server = None
        self.feed_mode = False
        self.feed_gesture_key = None
        self.last_feed_time = time.time()
        self.last_sys_metric_time = 0.0
        self.cpu_load = 0.0
        self.ram_load = 0.0

    def initialize(self):
        self.hand_tracker = HandTracker()
        self.mouse_controller = MouseController()
        self.gesture_engine = GestureEngine(standalone=False)
        self.gesture_engine.load_model()
        self.reload_registry()
        
        # Initialize context and multimodal trackers
        self.pose_head_tracker = PoseHeadTracker()
        self.multimodal_fusion = MultimodalFusion()
        self.multimodal_fusion.start()
        self.context_engine = ContextEngine()
        self.voice_engine = VoiceWelcomeEngine()
        self.voice_engine.speak_personalized_welcome()

    def reload_registry(self):
        try:
            mappings = self.db.fetch_gesture_mappings()
            if mappings:
                self.gesture_engine.set_mappings(mappings)
                return True
        except Exception as e:
            logger.error(f"Failed to fetch database mappings: {e}")
        return False

    def start_feeding(self, gesture_key):
        self.feed_mode = True
        self.feed_gesture_key = gesture_key
        logger.info(f"Landmarks feeding mode activated for: {gesture_key}")

    def stop_feeding(self):
        self.feed_mode = False
        self.feed_gesture_key = None
        logger.info("Landmarks feeding mode deactivated.")

    def calibrate_point(self, point_type, x, y):
        # Pass coordinates to mouse controller calibrator
        self.mouse_controller.move_to(x, y)
        logger.info(f"Calibration captured for {point_type}: {x:.3f}, {y:.3f}")

    def start_capture(self):
        if self.is_running:
            return
        
        cam_index = config.get("camera", {}).get("camera_index", None)
        width = config.get("camera", {}).get("frame_width", 640)
        height = config.get("camera", {}).get("frame_height", 480)
        fps = config.get("camera", {}).get("fps", 30)

        self.camera = Camera(camera_index=cam_index, width=width, height=height, target_fps=fps)
        self.camera.start()
        
        self.is_running = True
        self.capture_thread = threading.Thread(target=self._capture_loop)
        self.capture_thread.daemon = True
        self.capture_thread.start()
        logger.info("Background capture stream loop started.")

    def stop_capture(self):
        self.is_running = False
        if self.capture_thread:
            self.capture_thread.join(timeout=1.0)
            self.capture_thread = None
        if self.camera:
            self.camera.release()
            self.camera = None
        if self.mouse_controller:
            self.mouse_controller.release_all()
        if self.multimodal_fusion:
            self.multimodal_fusion.stop()
        if self.voice_engine:
            self.voice_engine.stop()
        if self.pose_head_tracker:
            self.pose_head_tracker.release()
        logger.info("Background capture stream loop stopped.")

    def _capture_loop(self):
        while self.is_running:
            start_time = time.time()
            grabbed, frame = self.camera.read()
            
            if not grabbed or frame is None:
                time.sleep(0.005)
                continue
            
            # Mirror the frame
            frame = cv2.flip(frame, 1)
            
            # Process hand landmarks
            landmarks, tracking_status, raw_landmarks = self.hand_tracker.process_frame(frame)
            
            # Process head pose (pitch and yaw offsets)
            pitch, yaw = 0.0, 0.0
            if self.pose_head_tracker:
                pitch, yaw = self.pose_head_tracker.process_frame(frame)

            # Process voice commands
            voice_command = "None"
            if self.multimodal_fusion:
                voice_command = self.multimodal_fusion.get_latest_command()

            gesture_name = "None"
            gesture_key = "None"
            confidence = 0.0
            action_state = "None"
            cursor_x, cursor_y = self.mouse_controller.prev_x, self.mouse_controller.prev_y
            
            # If voice command overrides input
            if voice_command != "None":
                if voice_command == "click":
                    self.mouse_controller.left_click()
                    action_state = "Voice Left Click"
                elif voice_command == "double":
                    self.mouse_controller.double_click()
                    action_state = "Voice Double Click"
                elif voice_command == "right":
                    self.mouse_controller.right_click()
                    action_state = "Voice Right Click"
                elif voice_command == "pause":
                    action_state = "Voice Tracking Standby"
                    self.mouse_controller.release_all()
            
            if tracking_status in ["Active", "Coasting"] and landmarks:
                # 1. Run predictions
                gesture_key, confidence = self.gesture_engine.predict(landmarks)
                
                # Check confidence threshold
                threshold = self.gesture_engine.confidence_threshold
                matched_mapping = self.gesture_engine.find_mapping(gesture_key)
                if matched_mapping:
                    threshold = matched_mapping.get("confidence_threshold", threshold)

                if confidence >= threshold:
                    stabilized_gesture = self.gesture_engine.stabilize(gesture_key)
                else:
                    stabilized_gesture = self.gesture_engine.stabilize("None")

                gesture_name = stabilized_gesture
                
                # 2. Execute actions & pointer movement
                if stabilized_gesture in ["OPEN_PALM"]:
                    index_tip = landmarks[8]
                    target_x = index_tip["x"]
                    target_y = index_tip["y"]
                    
                    # Refine pointer using head pose (gaze proxy)
                    gaze_assisted = config.get("multimodal", {}).get("gaze_assisted", True)
                    gaze_gain = config.get("multimodal", {}).get("gaze_gain", 1.5)
                    if gaze_assisted and (pitch != 0.0 or yaw != 0.0):
                        target_x += (yaw * 0.04 * gaze_gain)
                        target_y += (pitch * 0.04 * gaze_gain)
                        
                    # Direct cursor movement only during move
                    cursor_x, cursor_y = self.mouse_controller.move_to(target_x, target_y)
                    action_state = "Pointer Movement"
                else:
                    # Keep cursor at previous position for clicking, scrolling, and system controls
                    cursor_x, cursor_y = self.mouse_controller.prev_x, self.mouse_controller.prev_y
                    if stabilized_gesture == "FIST":
                        action_state = "Paused"
                        self.mouse_controller.release_all()
                    else:
                        action_state = "Pointer Stationary"

                # Check context mapping rules first, fallback to standard actions
                context_triggered = False
                if self.context_engine:
                    context_triggered = self.context_engine.handle_context_gesture(
                        stabilized_gesture, landmarks, self.mouse_controller
                    )
                
                if context_triggered:
                    action_state = f"Context Shortcut ({self.context_engine.active_app})"
                elif action_state != "Paused":
                    action_name = self.gesture_engine.execute_action(stabilized_gesture, landmarks, self.mouse_controller)
                    if action_name and action_name != "None":
                        action_state = action_name

                # 3. Database feeding record
                if self.feed_mode and self.feed_gesture_key:
                    now = time.time()
                    if now - self.last_feed_time >= 0.35:
                        self.last_feed_time = now
                        quality = confidence if confidence > 0 else 0.95
                        self.db.upload_dataset_sample(
                            gesture_key=self.feed_gesture_key,
                            landmark_vectors=landmarks,
                            sample_quality=quality
                        )
                        # Broadcast notice
                        if self.ws_server and self.ws_server.loop:
                            payload = {
                                "type": "dataset_uploaded",
                                "data": {
                                    "gesture_key": self.feed_gesture_key,
                                    "samples_count": 1
                                }
                            }
                            asyncio.run_coroutine_threadsafe(
                                self.ws_server.broadcast(json.dumps(payload)),
                                self.ws_server.loop
                            )
            else:
                self.gesture_engine.gesture_history.clear()
                self.mouse_controller.release_all()
                self.gesture_engine.prev_thumb_y = None
            
            # Query hardware metrics periodically (every 1.5s) to avoid UI lockups
            now = time.time()
            if now - self.last_sys_metric_time >= 1.5:
                self.last_sys_metric_time = now
                try:
                    import psutil
                    self.cpu_load = psutil.cpu_percent()
                    self.ram_load = psutil.virtual_memory().percent
                except Exception:
                    pass

            # Broadcast telemetry packet to all UI clients
            inference_time = (time.time() - start_time) * 1000.0
            if self.ws_server and self.ws_server.clients and self.ws_server.loop:
                payload = {
                    "type": "hand_landmarks",
                    "data": {
                        "gesture": gesture_name,
                        "gesture_key": gesture_key,
                        "confidence": confidence,
                        "fps": int(self.camera.fps),
                        "landmarkCount": len(landmarks),
                        "landmarks": landmarks,
                        "inferenceTimeMs": inference_time,
                        "trackingStatus": tracking_status,
                        "cursorX": cursor_x,
                        "cursorY": cursor_y,
                        "actionState": action_state,
                        "isFeeding": self.feed_mode,
                        "feedGestureKey": self.feed_gesture_key,
                        "activeApp": self.context_engine.active_app if self.context_engine else "General",
                        "headPitch": pitch,
                        "headYaw": yaw,
                        "voiceCommand": voice_command,
                        "cpuLoad": self.cpu_load,
                        "ramLoad": self.ram_load
                    }
                }
                asyncio.run_coroutine_threadsafe(
                    self.ws_server.broadcast(json.dumps(payload)),
                    self.ws_server.loop
                )

            # Cap frame processing loop rate to match camera frame rate (approx 33Hz)
            elapsed = time.time() - start_time
            sleep_duration = max(0.002, (1.0 / self.camera.target_fps) - elapsed)
            time.sleep(sleep_duration)


def run_standalone(mode):
    """
    Runs the OpenCV debug capture modes locally (camera, landmarks, mouse, gesture).
    """
    logger.info(f"=== Starting Standalone Diagnostic CLI Mode: {mode.upper()} ===")
    
    # 1. Initialize modules
    cam_index = config.get("camera", {}).get("camera_index", None)
    width = config.get("camera", {}).get("frame_width", 640)
    height = config.get("camera", {}).get("frame_height", 480)
    fps = config.get("camera", {}).get("fps", 30)

    try:
        camera = Camera(camera_index=cam_index, width=width, height=height, target_fps=fps)
        camera.start()
    except RuntimeError:
        # Camera unavailable fail fast
        sys.exit(1)

    tracker = HandTracker() if mode in ["landmarks", "mouse", "gesture"] else None
    mouse_ctrl = MouseController() if mode in ["mouse", "gesture"] else None
    
    gesture_eng = None
    if mode == "gesture":
        gesture_eng = GestureEngine(standalone=True)
        # Attempt model load
        model_loaded = gesture_eng.load_model()
        if not model_loaded:
            logger.warning("ML Gesture models missing. Falling back to geometric rules.")
            
    overlay_drawer = UIOverlay()

    window_name = f"VisionTouch Debug Mode: {mode.upper()}"
    cv2.namedWindow(window_name, cv2.WINDOW_AUTOSIZE)

    try:
        while True:
            start_time = time.time()
            grabbed, frame = camera.read()
            if not grabbed or frame is None:
                time.sleep(0.01)
                continue

            # Mirror frame
            frame = cv2.flip(frame, 1)

            # Setup defaults for overlay rendering
            tracking_status = "Idle"
            landmark_count = 0
            gesture_name = "None"
            confidence = 0.0
            action_state = "None"
            raw_lms = None

            if mode == "camera":
                # Only show camera and FPS
                frame = overlay_drawer.draw_hud(
                    frame=frame,
                    fps=camera.fps,
                    gesture_name="N/A",
                    confidence=0.0,
                    landmark_count=0,
                    action_state="Raw Feed Test",
                    tracking_status="Active",
                    active_zone=config.get("active_zone", {})
                )

            elif tracker:
                # Process hand landmarks
                landmarks, tracking_status, raw_lms = tracker.process_frame(frame)
                landmark_count = len(landmarks)

                if tracking_status == "Active" and landmarks:
                    # Draw skeletal connections
                    frame = tracker.draw_skeleton(frame, raw_lms)

                    if mode == "mouse":
                        # Only cursor movement, no gesture clicks
                        index_tip = landmarks[8]
                        cx, cy = mouse_ctrl.move_to(index_tip["x"], index_tip["y"])
                        action_state = f"Cursor: ({cx}, {cy})"

                    elif mode == "gesture" and gesture_eng:
                        # Full gestures click/drag/scroll
                        if gesture_eng.clf is not None:
                            # ML prediction
                            raw_key, raw_conf = gesture_eng.predict(landmarks)
                            threshold = gesture_eng.confidence_threshold
                            if raw_conf >= threshold:
                                stab_g = gesture_eng.stabilize(raw_key)
                                confidence = raw_conf
                            else:
                                stab_g = gesture_eng.stabilize("None")
                        else:
                            # Rule-based fallback if ML model is missing
                            # Left click = pinch index & thumb
                            # Drag = pinch index & thumb and hold
                            # Scroll = thumb extended, index/middle folded
                            # Right click = index & middle joined
                            l4 = landmarks[4] # Thumb tip
                            l8 = landmarks[8] # Index tip
                            l12 = landmarks[12] # Middle tip
                            
                            dist_pinch = math.sqrt((l4["x"] - l8["x"])**2 + (l4["y"] - l8["y"])**2 + (l4["z"] - l8["z"])**2)
                            dist_right = math.sqrt((l8["x"] - l12["x"])**2 + (l8["y"] - l12["y"])**2 + (l8["z"] - l12["z"])**2)
                            
                            if dist_pinch < 0.045:
                                stab_g = "INDEX_THUMB_PINCH"
                            elif dist_right < 0.04:
                                stab_g = "INDEX_MIDDLE_JOINED"
                            elif l4["y"] < l8["y"] and l8["y"] > landmarks[5]["y"]:
                                stab_g = "THUMB_ONLY"
                            elif landmarks[8]["y"] < landmarks[6]["y"] and landmarks[12]["y"] < landmarks[10]["y"]:
                                stab_g = "OPEN_PALM"
                            else:
                                stab_g = "None"
                                
                        gesture_name = stab_g
                        
                        # Move mouse unless paused
                        if stab_g != "FIST":
                            index_tip = landmarks[8]
                            mouse_ctrl.move_to(index_tip["x"], index_tip["y"])
                            action_state = "Pointer Movement"
                        else:
                            action_state = "Paused"
                            mouse_ctrl.release_all()

                        action_state = gesture_eng.execute_action(stab_g, landmarks, mouse_ctrl)

                else:
                    if mouse_ctrl:
                        mouse_ctrl.release_all()
                    if gesture_eng:
                        gesture_eng.gesture_history.clear()
                        gesture_eng.prev_thumb_y = None

                # Render detailed diagnostics HUD
                frame = overlay_drawer.draw_hud(
                    frame=frame,
                    fps=camera.fps,
                    gesture_name=gesture_name,
                    confidence=confidence,
                    landmark_count=landmark_count,
                    action_state=action_state,
                    tracking_status=tracking_status,
                    active_zone=config.get("active_zone", {})
                )

            cv2.imshow(window_name, frame)
            
            # Press Q to shutdown clean
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
            # Yield CPU briefly
            time.sleep(0.002)

    except KeyboardInterrupt:
        pass
    finally:
        if mouse_ctrl:
            mouse_ctrl.release_all()
        camera.release()
        cv2.destroyAllWindows()
        logger.info("Standalone Diagnostic CLI mode closed.")


def run_ml_check():
    """
    Checks ML model pickled check-points and runs diagnostic check.
    """
    logger.info("=== Running ML Model Diagnostic Verification ===")
    gesture_eng = GestureEngine(standalone=True)
    success = gesture_eng.load_model()
    
    if not success:
        logger.error(
            "[ERROR] Pickled machine learning models missing!\n"
            "----------------------------------------------------------------------\n"
            "Could not locate 'gesture_model.pkl' or 'label_encoder.pkl' in models folder.\n"
            "To resolve:\n"
            "  1. Start the backend server dashboard and compile landmarks data.\n"
            "  2. Run the compiler: 'python backend/training/train_model.py' to generate models.\n"
        )
        sys.exit(1)
    
    # Model loaded successfully
    logger.info("RandomForestClassifier diagnostics:")
    logger.info(f" - Model Path: {os.path.abspath(MODEL_PATH)}")
    logger.info(f" - Label Encoder Path: {os.path.abspath(LABEL_ENCODER_PATH)}")
    
    if hasattr(gesture_eng.clf, "classes_") and gesture_eng.label_encoder:
        classes = gesture_eng.label_encoder.classes_
        logger.info(f" - Registered Model Classes ({len(classes)}): {list(classes)}")
        logger.info(f" - Estimators: {len(gesture_eng.clf.estimators_)}")
    
    logger.info("[SUCCESS] ML Model verified as 100% operational.")


async def main():
    parser = argparse.ArgumentParser(description="VisionTouch Modular Real-Time Backend Orchestrator")
    parser.add_argument(
        "--mode", 
        type=str, 
        choices=["camera", "landmarks", "mouse", "gesture", "ml", "server"], 
        default="server",
        help="Pipeline diagnostic test modes or full websocket server option."
    )
    parser.add_argument("--cam", type=int, default=None, help="Force override webcam device index.")
    args = parser.parse_args()

    # Override camera index config if command line arg is provided
    if args.cam is not None:
        config["camera"]["camera_index"] = args.cam

    if args.mode in ["camera", "landmarks", "mouse", "gesture"]:
        run_standalone(args.mode)
    elif args.mode == "ml":
        run_ml_check()
    else:
        # Default Server / WebSocket mode
        logger.info("=== Initializing VisionTouch Enterprise WebSocket Server Node ===")
        
        # Disable PyAutoGUI Failsafe
        import pyautogui
        pyautogui.FAILSAFE = False
        pyautogui.PAUSE = 0.0

        runner = EngineRunner()
        runner.initialize()

        host = config.get("websocket", {}).get("host", "0.0.0.0")
        port = config.get("websocket", {}).get("port", 8765)
        
        server = WebSocketServer(host=host, port=port, engine_runner=runner)
        runner.ws_server = server
        
        # Start capture immediately on server boot
        runner.start_capture()
        
        await server.start()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("VisionTouch AI Server shutting down gracefully...")
        sys.exit(0)
