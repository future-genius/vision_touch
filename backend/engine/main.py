import sys
import asyncio
from backend.engine.vision_engine import VisionEngine, ThreadedVideoCapture

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
