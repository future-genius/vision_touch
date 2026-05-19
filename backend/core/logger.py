import os
import sys
import logging

def setup_logger(name="VisionTouch", log_file=None):
    """
    Sets up a structured logger that output logs to stdout and a file.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    
    # Avoid duplicate handlers if logger is already initialized
    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console Handler (Only show INFO and above to avoid cluttering stderr/stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File Handler (Log everything to backend/logs/)
    if log_file is None:
        backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        logs_dir = os.path.join(backend_root, "logs")
        os.makedirs(logs_dir, exist_ok=True)
        log_file = os.path.join(logs_dir, "vision_touch.log")
        
    try:
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: Could not create log file: {e}")

    return logger

# Global logger instance
logger = setup_logger()
