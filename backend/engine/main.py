import os
import sys

# Remove local backend directories from sys.path to prevent name collisions (e.g. backend/realtime)
script_dir = os.path.abspath(os.path.dirname(__file__))
parent_dir = os.path.abspath(os.path.join(script_dir, ".."))
if script_dir in sys.path:
    sys.path.remove(script_dir)
if parent_dir in sys.path:
    sys.path.remove(parent_dir)

# Add workspace root at the beginning of the path
workspace_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

import asyncio
from backend.engine.vision_engine import VisionEngine, ThreadedVideoCapture

async def main():
    # Detect if '--debug' flag is passed
    debug = '--debug' in sys.argv
    engine = VisionEngine(debug_mode=debug)
    
    # Automatically start CV2 camera capture stream on boot for autonomous desktop tracking
    engine.start_capture()
    
    # Run WebSockets Server
    await engine.ws.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down VisionTouch AI Engine...")
        sys.exit(0)
