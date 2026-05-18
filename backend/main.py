import os
import sys

# Remove local script directory from sys.path to prevent name collisions (e.g. backend/realtime vs pip realtime)
script_dir = os.path.abspath(os.path.dirname(__file__))
if script_dir in sys.path:
    sys.path.remove(script_dir)

# Add workspace root at the beginning of the path
workspace_root = os.path.abspath(os.path.join(script_dir, ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

import asyncio
from backend.engine.vision_engine import VisionEngine

async def main():
    # Check for terminal arguments
    debug = '--debug' in sys.argv
    print(f"\n=== Starting VisionTouch Enterprise AI Platform (Debug: {debug}) ===")
    
    # Check for custom camera index argument: --cam <index>
    cam_index = None
    if '--cam' in sys.argv:
        try:
            idx = sys.argv.index('--cam')
            cam_index = int(sys.argv[idx + 1])
        except Exception:
            pass
            
    # Instantiate the unified ML vision engine
    engine = VisionEngine(debug_mode=debug)
    
    # Automatically start CV2 camera capture stream on boot for autonomous desktop tracking
    engine.start_capture(cam_index=cam_index)
    
    # Run the WebSocket server broadcast loop forever
    await engine.ws.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Engine] Shutting down VisionTouch AI Server gracefully...")
        sys.exit(0)
