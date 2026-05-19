import os

# --- Workspace & Path Resolutions ---
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WORKSPACE_ROOT = os.path.abspath(os.path.join(BACKEND_ROOT, ".."))

DATASETS_DIR = os.path.join(BACKEND_ROOT, "datasets")
UPLOADS_DIR = os.path.join(DATASETS_DIR, "uploads")
MODELS_DIR = os.path.join(BACKEND_ROOT, "models")

# Ensure required directories exist
os.makedirs(DATASETS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# File Paths
CSV_DATASET_PATH = os.path.join(DATASETS_DIR, "gesture_dataset.csv")
JSON_DATASET_FALLBACK_PATH = os.path.join(DATASETS_DIR, "gesture_dataset.json")
MODEL_PATH = os.path.join(MODELS_DIR, "gesture_model.pkl")
LABEL_ENCODER_PATH = os.path.join(MODELS_DIR, "label_encoder.pkl")

# --- Telemetry & WebSocket Server Settings ---
WEBSOCKET_HOST = "0.0.0.0"
WEBSOCKET_PORT = 8765
PING_INTERVAL = 5.0 # Heartbeat check interval in seconds

# --- Neural Classifier Mappings & Classes ---
# Standard ML labels that the RandomForestClassifier is trained on
ML_CLASSES = [
    "OPEN_PALM",
    "INDEX_ONLY",
    "INDEX_THUMB_PINCH",
    "INDEX_MIDDLE_JOINED",
    "FIST",
    "THUMB_ONLY",
    "THUMB_INDEX_MIDDLE"
]

# Human-readable labels mapped to dynamic UI descriptions
GESTURE_INFO = {
    "OPEN_PALM": {
        "name": "Pointer Movement",
        "description": "Move your hand to control the mouse cursor smoothly.",
        "icon": "MousePointer2"
    },
    "INDEX_ONLY": {
        "name": "Left Click",
        "description": "Extend only your index finger to register a single left-click.",
        "icon": "Pointer"
    },
    "INDEX_THUMB_PINCH": {
        "name": "Text Selection / Drag",
        "description": "Pinch your thumb and index fingers to select text or drag items.",
        "icon": "Sliders"
    },
    "INDEX_MIDDLE_JOINED": {
        "name": "Right Click",
        "description": "Hold index and middle fingers together to open context menus.",
        "icon": "MousePointer"
    },
    "FIST": {
        "name": "Pause / Stop",
        "description": "Clench into a fist to stop all mouse tracking or actions.",
        "icon": "CircleOff"
    },
    "THUMB_ONLY": {
        "name": "Scroll Actions",
        "description": "Extend only your thumb to trigger live scrolling actions.",
        "icon": "Scroll"
    },
    "THUMB_INDEX_MIDDLE": {
        "name": "System Control / Toggle",
        "description": "Pinch three fingers to toggle dashboard states or calibrate.",
        "icon": "Maximize"
    },
    "None": {
        "name": "Idle State",
        "description": "No active gesture detected on camera.",
        "icon": "ShieldCheck"
    }
}

# --- Smooth Cursor Damping & Coordinate Interpolation ---
CURSOR_DEFAULT_SENSITIVITY = 1.8
CURSOR_DEFAULT_SMOOTHING = 0.50
CURSOR_DEFAULT_DEAD_ZONE = 0.02

# Active comfortable tracking frame box (crop out coordinates outside these ranges)
ACTIVE_ZONE_MIN_X = 0.30
ACTIVE_ZONE_MAX_X = 0.70
ACTIVE_ZONE_MIN_Y = 0.25
ACTIVE_ZONE_MAX_Y = 0.65

# --- PyAutoGUI Performance Constants ---
FAILSAFE = False
PAUSE = 0.0
