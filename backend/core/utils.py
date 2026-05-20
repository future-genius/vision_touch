import os
import sys
import yaml

# Resolve path references
CORE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CORE_DIR)
WORKSPACE_ROOT = os.path.dirname(BACKEND_ROOT)

def load_config():
    """
    Loads configuration settings from config.yaml in the backend directory.
    Falls back to hardcoded defaults if config.yaml is not found or malformed.
    """
    config_path = os.path.join(BACKEND_ROOT, "config.yaml")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                return yaml.safe_load(f) or {}
        except Exception as e:
            print(f"Warning: Failed to load config.yaml ({e}). Using defaults.")
    
    # Factory defaults fallback
    return {
        "camera": {"camera_index": None, "frame_width": 640, "frame_height": 480, "fps": 30},
        "cursor": {"sensitivity": 1.2, "smoothing": 0.80, "dead_zone": 0.001, "screen_scale": 1.0,
                   "one_euro": {"min_cutoff": 0.05, "beta": 0.03, "d_cutoff": 1.0}},
        "active_zone": {"min_x": 0.30, "max_x": 0.70, "min_y": 0.25, "max_y": 0.65},
        "gestures": {
            "pinch_threshold": 0.05,
            "confidence_threshold": 0.65,
            "click_cooldown_ms": 400,
            "scroll_cooldown_ms": 100,
            "drag_cooldown_ms": 30,
            "stabilization_frames": 2,
            "drag_release_delay_ms": 150
        },
        "websocket": {"host": "0.0.0.0", "port": 8765, "ping_interval": 5.0}
    }

# Export global configuration
config = load_config()

# Setup derived paths
DATASETS_DIR = os.path.join(BACKEND_ROOT, "datasets")
MODELS_DIR = os.path.join(BACKEND_ROOT, "models")
CSV_DATASET_PATH = os.path.join(DATASETS_DIR, "gesture_dataset.csv")
JSON_DATASET_FALLBACK_PATH = os.path.join(DATASETS_DIR, "gesture_dataset.json")
MODEL_PATH = os.path.join(MODELS_DIR, "gesture_model.pkl")
LABEL_ENCODER_PATH = os.path.join(MODELS_DIR, "label_encoder.pkl")
HAND_LANDMARKER_TASK_PATH = os.path.join(WORKSPACE_ROOT, "public", "hand_landmarker.task")

os.makedirs(DATASETS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

IS_WINDOWS = os.name == "nt"

def map_legacy_gesture_keys(key):
    """
    Normalizes old gesture keys to the new uppercase format for consistency.
    """
    mapping = {
        "move": "OPEN_PALM",
        "index_pointer": "OPEN_PALM",
        "click": "INDEX_THUMB_PINCH",
        "pinch_click": "INDEX_THUMB_PINCH",
        "right_click": "INDEX_MIDDLE_JOINED",
        "fist": "FIST",
        "scroll": "THUMB_ONLY",
        "scroll_up": "INDEX_ONLY",
        "scroll_down": "THUMB_ONLY",
        "index_only": "INDEX_ONLY",
        "thumb_only": "THUMB_ONLY"
    }
    return mapping.get(key.lower(), key.upper())

def get_active_window_title():
    """
    Returns the title of the currently focused foreground window.
    Uses ctypes on Windows to avoid external dependencies.
    """
    if not IS_WINDOWS:
        return "Desktop"
    try:
        import ctypes
        hwnd = ctypes.windll.user32.GetForegroundWindow()
        if not hwnd:
            return "Desktop"
        length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
        if length == 0:
            return "Desktop"
        buf = ctypes.create_unicode_buffer(length + 1)
        ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
        return buf.value
    except Exception:
        return "Desktop"

