import asyncio
import websockets
import json
import time

class WsServer:
    def __init__(self, port=8765):
        self.port = port
        self.clients = set()
        self.engine = None  # Reference to VisionEngine orchestration instance

    def set_engine(self, engine):
        self.engine = engine

    async def register(self, websocket):
        self.clients.add(websocket)
        print(f"[WebSocket] Client connected: {websocket.remote_address}. Total: {len(self.clients)}")
        # Send initial registration acknowledgement
        try:
            await websocket.send(json.dumps({
                "type": "user_connected",
                "message": "Connected to VisionTouch Realtime AI Server",
                "active_clients": len(self.clients)
            }))
        except Exception:
            pass

    async def unregister(self, websocket):
        self.clients.discard(websocket)
        print(f"[WebSocket] Client disconnected: {websocket.remote_address}. Total: {len(self.clients)}")

    async def broadcast(self, payload):
        """
        Broadcasts a message payload to all connected clients.
        """
        # Take a thread-safe atomic shallow snapshot of the clients set to prevent RuntimeError: Set changed size during iteration
        active_clients = list(self.clients)
        if not active_clients:
            return
            
        message = json.dumps(payload)
        disconnected = []
        for client in active_clients:
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected.append(client)
            except Exception as e:
                # Disconnect if send failed to prevent stale blocking threads
                disconnected.append(client)
                
        for client in disconnected:
            await self.unregister(client)

    async def handle_message(self, websocket, path=None):
        await self.register(websocket)
        try:
            # Heartbeat check loop inside message handler
            async for message in websocket:
                try:
                    event = json.loads(message)
                    event_type = event.get("type")
                    data = event.get("data", {})
                    
                    print(f"[WebSocket] Received event '{event_type}'")
                    
                    if event_type == "initialize_engine":
                        if self.engine:
                            self.engine.start_capture()
                            await websocket.send(json.dumps({
                                "type": "admin_notification",
                                "message": "Neural Vision Engine Initialized Successfully",
                                "status": "Active"
                            }))
                            
                    elif event_type == "disconnect_engine":
                        if self.engine:
                            self.engine.stop_capture()
                            await websocket.send(json.dumps({
                                "type": "admin_notification",
                                "message": "Neural Vision Engine Standby",
                                "status": "Idle"
                            }))
                            
                    elif event_type == "hot_reload":
                        if self.engine:
                            success = self.engine.reload_registry()
                            await self.broadcast({
                                "type": "inference_updated",
                                "message": "Active gesture mappings hot-reloaded globally",
                                "success": success
                            })
                            
                    elif event_type == "retrain_model":
                        if self.engine:
                            try:
                                from backend.inference.train_pipeline import GestureTrainPipeline
                                pipeline = GestureTrainPipeline()
                                success = pipeline.train()
                                if success:
                                    # Reload the classifier ML model
                                    self.engine.classifier.load_ml_model()
                                    # Reload mappings
                                    self.engine.reload_registry()
                                    
                                await self.broadcast({
                                    "type": "inference_updated",
                                    "message": "AI Gesture model retrained and hot-loaded successfully!",
                                    "success": success
                                })
                            except Exception as e:
                                print(f"Error retraining model: {e}")
                                await websocket.send(json.dumps({
                                    "type": "admin_notification",
                                    "message": f"Retraining failed: {str(e)}",
                                    "success": False
                                }))
                            
                    elif event_type == "start_feeding":
                        g_key = data.get("gesture_key")
                        if self.engine and g_key:
                            self.engine.start_feed_mode(g_key)
                            await websocket.send(json.dumps({
                                "type": "admin_notification",
                                "message": f"Started feeding training landmarks for '{g_key}'",
                                "gesture_key": g_key
                            }))
                            
                    elif event_type == "stop_feeding":
                        if self.engine:
                            self.engine.stop_feed_mode()
                            await websocket.send(json.dumps({
                                "type": "admin_notification",
                                "message": "Landmarks feeding stopped."
                            }))
                            
                    elif event_type == "calibrate_point":
                        point_type = data.get("point") # 'top_left' or 'bottom_right'
                        norm_x = data.get("x")
                        norm_y = data.get("y")
                        if self.engine and norm_x is not None and norm_y is not None:
                            self.engine.calibrate_coordinate(norm_x, norm_y)
                            await websocket.send(json.dumps({
                                "type": "calibration_updated",
                                "message": f"Calibration coordinate captured: {point_type}"
                            }))
                            
                    elif event_type == "set_cursor_config":
                        sens = data.get("sensitivity")
                        smooth = data.get("smoothing")
                        dead = data.get("dead_zone")
                        if self.engine:
                            self.engine.update_cursor_settings(sens, smooth, dead)
                            await websocket.send(json.dumps({
                                "type": "admin_notification",
                                "message": "Cursor calibration settings updated successfully"
                            }))
                            
                    elif event_type == "ping":
                        await websocket.send(json.dumps({"type": "pong", "timestamp": time.time()}))
                        
                except json.JSONDecodeError:
                    print("[WebSocket] Received non-JSON payload.")
                except Exception as e:
                    print(f"[WebSocket] Error processing event: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister(websocket)

    async def start(self):
        print(f"Starting WebSocket server on ws://localhost:{self.port}...")
        async with websockets.serve(self.handle_message, "localhost", self.port):
            await asyncio.Future()  # run forever
