import os
import threading
from PIL import Image, ImageDraw
from backend.core.logger import logger

class SystemTrayManager:
    """
    Creates and manages a system tray icon for VisionTouch.
    """
    def __init__(self, on_show_window=None, on_quit=None):
        self.on_show_window = on_show_window
        self.on_quit = on_quit
        self.icon = None
        self.thread = None

    def _create_image(self):
        # Create a default high-quality icon image dynamically
        size = 64
        image = Image.new('RGB', (size, size), color='#1E3A5F') # primary blue
        draw = ImageDraw.Draw(image)
        # Draw a stylish rounded rectangle and a circle to resemble the gesture hand tracker
        draw.rectangle([16, 16, 48, 48], outline="white", width=4)
        draw.ellipse([26, 26, 38, 38], fill="#16A34A") # success green center dot
        return image

    def start(self):
        try:
            import pystray
        except ImportError:
            logger.warning("pystray library not found on user system. Skipping tray icon startup.")
            return

        menu = pystray.Menu(
            pystray.MenuItem('Show Workspace Dashboard', self._show_window),
            pystray.MenuItem('Quit VisionTouch', self._quit)
        )
        self.icon = pystray.Icon(
            "VisionTouch",
            icon=self._create_image(),
            title="VisionTouch AI Controller",
            menu=menu
        )
        self.thread = threading.Thread(target=self.icon.run, daemon=True)
        self.thread.start()
        logger.info("System tray management thread initialized.")

    def _show_window(self, icon, item):
        if self.on_show_window:
            self.on_show_window()

    def _quit(self, icon, item):
        logger.info("Quit chosen via system tray menu.")
        if self.on_quit:
            self.on_quit()
        if self.icon:
            self.icon.stop()
