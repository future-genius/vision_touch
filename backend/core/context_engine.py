import time
import pyautogui
from backend.core.logger import logger
from backend.core.utils import get_active_window_title, config

class ContextEngine:
    """
    Monitors active foreground window titles and overrides default gesture actions
    with context-specific application commands (Chrome, YouTube, PowerPoint, VS Code).
    """
    def __init__(self):
        self.enabled = config.get("context_engine", {}).get("enabled", True)
        self.poll_interval = config.get("context_engine", {}).get("poll_interval_sec", 1.0)
        self.active_app = "General"
        self.last_poll_time = 0.0
        
        # Configure PyAutoGUI keyboard response latency
        pyautogui.PAUSE = 0.0

    def update_context(self):
        """
        Polls the OS foreground window and classifies the active workspace context.
        """
        if not self.enabled:
            self.active_app = "General"
            return
            
        now = time.time()
        if now - self.last_poll_time < self.poll_interval:
            return
            
        self.last_poll_time = now
        title = get_active_window_title().lower()
        
        if "youtube" in title or "netflix" in title:
            self.active_app = "YouTube"
        elif "chrome" in title or "edge" in title or "firefox" in title:
            self.active_app = "Chrome"
        elif "powerpoint" in title or "slide show" in title or "slides" in title:
            self.active_app = "PowerPoint"
        elif "visual studio code" in title or "vscode" in title or "code" in title:
            self.active_app = "VS Code"
        else:
            self.active_app = "General"

    def handle_context_gesture(self, gesture, landmarks, mouse_ctrl):
        """
        Intercepts gestures and executes application-specific actions.
        Returns True if the gesture was handled by context rules, False otherwise.
        """
        self.update_context()
        
        if self.active_app == "General":
            return False

        try:
            if self.active_app == "Chrome":
                # Swipe gesture triggers Tab Switch
                # We identify swipe by looking at movement of hand center (landmark 9)
                if gesture == "THUMB_ONLY":
                    # Custom tab switch: send Ctrl + PageDown
                    pyautogui.hotkey("ctrl", "pagedown")
                    logger.info("Context Action [Chrome]: Next Tab (Ctrl+PgDn)")
                    return True
                elif gesture == "INDEX_MIDDLE_JOINED":
                    # Double click zoom
                    pyautogui.hotkey("ctrl", "+")
                    logger.info("Context Action [Chrome]: Zoom In (Ctrl++)")
                    return True

            elif self.active_app == "YouTube":
                if gesture == "FIST":
                    # Pause / Play shortcut
                    pyautogui.press("space")
                    logger.info("Context Action [YouTube]: Pause/Play (Space)")
                    return True
                elif gesture == "THUMB_ONLY":
                    # Scroll or volume adjust
                    pyautogui.press("up")
                    logger.info("Context Action [YouTube]: Volume Up")
                    return True
                elif gesture == "INDEX_MIDDLE_JOINED":
                    pyautogui.press("down")
                    logger.info("Context Action [YouTube]: Volume Down")
                    return True

            elif self.active_app == "PowerPoint":
                if gesture == "THUMB_ONLY":
                    # Next slide
                    pyautogui.press("right")
                    logger.info("Context Action [PowerPoint]: Next Slide")
                    return True
                elif gesture == "INDEX_MIDDLE_JOINED":
                    # Previous slide
                    pyautogui.press("left")
                    logger.info("Context Action [PowerPoint]: Previous Slide")
                    return True

            elif self.active_app == "VS Code":
                if gesture == "THUMB_ONLY":
                    # Scroll code up
                    pyautogui.scroll(120)
                    logger.info("Context Action [VS Code]: Scroll Up")
                    return True
                elif gesture == "INDEX_MIDDLE_JOINED":
                    # Scroll code down
                    pyautogui.scroll(-120)
                    logger.info("Context Action [VS Code]: Scroll Down")
                    return True

        except Exception as e:
            logger.error(f"Failed to execute context-aware keyboard trigger: {e}")
            
        return False
