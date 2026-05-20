import sys
import os
import threading
import asyncio
import time
import webview

# Add the workspace root to python path to ensure imports resolve correctly
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from backend.main import main as run_backend_async

def start_backend():
    """Runs the asyncio backend server loop in a background thread."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Mock command line arguments to run default WebSocket mode
    sys.argv = [sys.argv[0]]
    
    try:
        loop.run_until_complete(run_backend_async())
    except Exception as e:
        print(f"[Desktop App] Backend error: {e}")

if __name__ == "__main__":
    print("[Desktop App] Initializing VisionTouch Enterprise Desktop Node...")
    
    # 1. Start the Python server in a background daemon thread
    backend_thread = threading.Thread(target=start_backend, daemon=True)
    backend_thread.start()
    
    # 2. Let the server bind and initialize the MediaPipe engines
    time.sleep(2.0)
    
    # 3. Initialize and start the System Tray Icon
    from backend.core.tray_icon import SystemTrayManager
    
    def show_window():
        try:
            print("[Desktop App] Showing window...")
            window.show()
        except Exception as e:
            print(f"[Desktop App] Error bringing window to focus: {e}")

    def quit_app():
        try:
            print("[Desktop App] Cleaning up and exiting...")
            window.destroy()
        except Exception as e:
            print(f"[Desktop App] Error destroying window: {e}")
        os._exit(0)

    tray = SystemTrayManager(on_show_window=show_window, on_quit=quit_app)
    tray.start()

    # 4. Open a native desktop window pointing to the dashboard
    print("[Desktop App] Launching native window...")
    window = webview.create_window(
        title="VisionTouch - AI Gestures Controller",
        url="https://vision-touch.netlify.app/dashboard/camera",
        width=1280,
        height=800,
        resizable=True,
        min_size=(1024, 768)
    )
    
    # 5. Start webview event loop (blocks until window is closed)
    webview.start()
    print("[Desktop App] Window closed. Cleaning up resources and exiting...")
