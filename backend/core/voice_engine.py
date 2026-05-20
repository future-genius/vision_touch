import os
import threading
import queue
from backend.core.logger import logger

class VoiceWelcomeEngine:
    """
    Offline Text-To-Speech welcome and system status announcer using pyttsx3.
    Operates in a background daemon thread to avoid blocking main CV loop.
    """
    def __init__(self):
        self.speech_queue = queue.Queue()
        self.is_running = True
        self.thread = threading.Thread(target=self._speech_loop, daemon=True)
        self.thread.start()
        logger.info("Voice Welcome Engine background thread started.")

    def _speech_loop(self):
        # Initialize pyttsx3 inside the thread loop because Windows COM objects
        # must be initialized in the thread where they run runAndWait().
        try:
            import pyttsx3
            engine = pyttsx3.init()
            # Premium calibration parameters: slow rate and high volume
            engine.setProperty('rate', 160)
            engine.setProperty('volume', 0.95)
            
            # Prefer a calm natural female sounding voice if present in system voices
            voices = engine.getProperty('voices')
            for voice in voices:
                if "zira" in voice.name.lower() or "hazel" in voice.name.lower():
                    engine.setProperty('voice', voice.id)
                    break
        except Exception as e:
            logger.error(f"Failed to initialize pyttsx3 in speech thread: {e}")
            return

        while self.is_running:
            try:
                text = self.speech_queue.get(timeout=0.5)
            except queue.Empty:
                continue

            try:
                logger.info(f"Voice Welcome Engine speaking: '{text}'")
                engine.say(text)
                engine.runAndWait()
            except Exception as e:
                logger.error(f"Error inside pyttsx3 run loop: {e}")
            finally:
                self.speech_queue.task_done()

    def speak(self, text):
        """Asynchronously queues speech text."""
        if self.is_running:
            self.speech_queue.put(text)

    def speak_personalized_welcome(self):
        """Greets the user utilizing Windows username or local profile."""
        try:
            # Retrieve Windows username
            username = os.getlogin()
        except Exception:
            username = os.environ.get("USERNAME", "Operator")
            
        welcome_msg = f"Welcome back, {username}. VisionTouch systems are active."
        self.speak(welcome_msg)

    def stop(self):
        self.is_running = False
        self.thread.join(timeout=1.0)
