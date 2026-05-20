import os
from backend.core.utils import (
    BACKEND_ROOT, WORKSPACE_ROOT, DATASETS_DIR, MODELS_DIR,
    CSV_DATASET_PATH, JSON_DATASET_FALLBACK_PATH, MODEL_PATH,
    LABEL_ENCODER_PATH, config
)

# Required directories
UPLOADS_DIR = os.path.join(DATASETS_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Telemetry & WebSocket settings
WEBSOCKET_HOST = config.get("websocket", {}).get("host", "0.0.0.0")
WEBSOCKET_PORT = config.get("websocket", {}).get("port", 8765)
PING_INTERVAL = config.get("websocket", {}).get("ping_interval", 5.0)

# Neural Classifier Classes
ML_CLASSES = [
    "OPEN_PALM",
    "INDEX_ONLY",
    "INDEX_THUMB_PINCH",
    "INDEX_MIDDLE_JOINED",
    "FIST",
    "THUMB_ONLY"
]

# Telemetry UI descriptions
GESTURE_INFO = {
    "OPEN_PALM": {"name": "Pointer Movement", "description": "Move hand to control cursor position.", "icon": "MousePointer2"},
    "INDEX_ONLY": {"name": "Scroll Up", "description": "Extend index finger alone to scroll up.", "icon": "ChevronUp"},
    "INDEX_THUMB_PINCH": {"name": "Left Click & Drag", "description": "Pinch index and thumb to click/select text.", "icon": "Sliders"},
    "INDEX_MIDDLE_JOINED": {"name": "Right Click", "description": "Hold index and middle together for context menu.", "icon": "MousePointer"},
    "FIST": {"name": "Pause / Stop", "description": "Clench fist to stay stationary.", "icon": "CircleOff"},
    "THUMB_ONLY": {"name": "Scroll Down", "description": "Extend thumb alone to scroll down.", "icon": "ChevronDown"},
    "None": {"name": "Idle State", "description": "No hand detected on camera.", "icon": "ShieldCheck"}
}

# Cursor scaling mapping defaults
CURSOR_DEFAULT_SENSITIVITY = config.get("cursor", {}).get("sensitivity", 1.8)
CURSOR_DEFAULT_SMOOTHING = config.get("cursor", {}).get("smoothing", 0.50)
CURSOR_DEFAULT_DEAD_ZONE = config.get("cursor", {}).get("dead_zone", 0.02)

ACTIVE_ZONE_MIN_X = config.get("active_zone", {}).get("min_x", 0.30)
ACTIVE_ZONE_MAX_X = config.get("active_zone", {}).get("max_x", 0.70)
ACTIVE_ZONE_MIN_Y = config.get("active_zone", {}).get("min_y", 0.25)
ACTIVE_ZONE_MAX_Y = config.get("active_zone", {}).get("max_y", 0.65)

# PyAutoGUI Defaults
FAILSAFE = False
PAUSE = 0.0
