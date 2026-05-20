import os
import threading
import queue
import time
from backend.core.logger import logger
from backend.core.utils import config

class MultimodalFusion:
    """
    Offline speech recognition engine using Vosk to enable voice commands.
    Provides thread-safe access to the latest recognized speech command.
    """
    def __init__(self):
        self.speech_enabled = config.get("multimodal", {}).get("speech_enabled", True)
        self.vosk_model_path = config.get("multimodal", {}).get("vosk_model_path", "backend/models/vosk-model-small-en-us-0.15")
        self.wake_word = config.get("multimodal", {}).get("wake_word", "vision").lower()
        
        self.voice_command_queue = queue.Queue()
        self.is_running = False
        self.thread = None
        self.vosk_loaded = False
        self.latest_command = "None"
        self.latest_command_time = 0.0

        if self.speech_enabled:
            # Check model path
            from backend.core.utils import WORKSPACE_ROOT
            if not os.path.isabs(self.vosk_model_path):
                self.vosk_model_path = os.path.join(WORKSPACE_ROOT, self.vosk_model_path)
            
            # Start speech recognition thread
            self.thread = threading.Thread(target=self._speech_loop, daemon=True)
        else:
            logger.info("Speech recognition is disabled in configuration.")

    def start(self):
        if self.speech_enabled and self.thread and not self.is_running:
            self.is_running = True
            self.thread.start()
            logger.info("Multimodal voice engine thread started.")

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=1.0)
            self.thread = None
        logger.info("Multimodal voice engine thread stopped.")

    def _speech_loop(self):
        try:
            import sounddevice as sd
            import json
        except ImportError:
            logger.warning("Optional sounddevice library not installed. Disabling voice feature.")
            return

        # Try importing Vosk
        try:
            from vosk import Model, KalmRecognizer
        except ImportError:
            logger.warning("Vosk speech recognition library not installed. Run 'pip install vosk'. Disabling voice feature.")
            return

        if not os.path.exists(self.vosk_model_path):
            logger.warning(
                f"Vosk model folder not found at: {self.vosk_model_path}.\n"
                "Please download small Vosk English model and unpack to backend/models/ to enable offline speech."
            )
            return

        try:
            logger.info(f"Loading Vosk speech model from {self.vosk_model_path}...")
            model = Model(self.vosk_model_path)
            # Sample rate 16000Hz is standard for Vosk small models
            recognizer = KalmRecognizer(model, 16000)
            self.vosk_loaded = True
            logger.info("Vosk model loaded successfully. Microphone listening active.")
        except Exception as e:
            logger.error(f"Failed to initialize Vosk model: {e}")
            return

        def audio_callback(indata, frames, time_info, status):
            if status:
                pass
            self.voice_command_queue.put(bytes(indata))

        # Start microphone input stream
        try:
            with sd.RawInputStream(samplerate=16000, blocksize=8000, dtype='int16',
                                   channels=1, callback=audio_callback):
                while self.is_running:
                    try:
                        data = self.voice_command_queue.get(timeout=0.2)
                        if recognizer.AcceptWaveform(data):
                            result = json.loads(recognizer.Result())
                            text = result.get("text", "").lower()
                            if text:
                                logger.info(f"Speech heard: '{text}'")
                                self._parse_speech_command(text)
                    except queue.Empty:
                        continue
                    except Exception as e:
                        logger.error(f"Speech recognition processing error: {e}")
                        time.sleep(0.1)
        except Exception as e:
            logger.error(f"Microphone input stream failed: {e}. Check if mic is connected and configured.")

    def _parse_speech_command(self, text):
        # Checks if wake word is mentioned or direct commands are spoken
        words = text.split()
        
        # Valid commands list
        commands = ["click", "double", "right", "scroll", "up", "down", "pause", "resume", "status", "dashboard"]
        
        # Check if the text matches any command
        matched_cmd = None
        for cmd in commands:
            if cmd in words:
                matched_cmd = cmd
                break

        if matched_cmd:
            # Require wake-word if configured
            if self.wake_word and self.wake_word in words:
                self.latest_command = matched_cmd
                self.latest_command_time = time.time()
                logger.info(f"Validated Multimodal Voice Command: {matched_cmd.upper()}")
            elif not self.wake_word:
                self.latest_command = matched_cmd
                self.latest_command_time = time.time()
                logger.info(f"Validated Multimodal Voice Command: {matched_cmd.upper()}")

    def get_latest_command(self):
        """
        Returns the latest voice command if it occurred within the last 2.0 seconds.
        """
        now = time.time()
        if now - self.latest_command_time < 2.0:
            cmd = self.latest_command
            self.latest_command = "None" # consume command
            return cmd
        return "None"
