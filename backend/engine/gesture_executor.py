import os
import subprocess
import pyautogui
import time
from backend.config import settings

# Direct Win32 inputs for zero-latency interactions on Windows
IS_WINDOWS = os.name == 'nt'
if IS_WINDOWS:
    import ctypes
    MOUSEEVENTF_LEFTDOWN = 0x0002
    MOUSEEVENTF_LEFTUP = 0x0004
    MOUSEEVENTF_RIGHTDOWN = 0x0008
    MOUSEEVENTF_RIGHTUP = 0x0010
    MOUSEEVENTF_WHEEL = 0x0800

class ActionExecutor:
    def __init__(self):
        # Override PyAutoGUI defaults to achieve instant response
        pyautogui.FAILSAFE = settings.FAILSAFE
        pyautogui.PAUSE = settings.PAUSE

        # State tracking
        self.is_dragging = False
        self.last_execution_times = {} # action_name -> float timestamp
        self.last_gesture = None  # Track the last executed gesture for trigger-once gating

    def execute(self, action_type, action_parameters=None, cooldown=0.4, action_name="default", gesture_key=None):
        """
        Interprets dynamic inputs, validates cooldown timelines, enforces trigger-once,
        and fires instant Win32 or PyAutoGUI commands.
        """
        if action_parameters is None:
            action_parameters = {}

        now = time.time()
        last_time = self.last_execution_times.get(action_name, 0.0)

        # 1. Trigger-Once Gating for Instant Actions
        is_instant = action_type in ['left_click', 'right_click', 'double_click', 'shortcut', 'media', 'app_launch']
        if is_instant and gesture_key is not None and gesture_key == self.last_gesture:
            return False

        # Bypass cooldowns for continuous actions to deliver high responsiveness (scrolling, dragging)
        actual_cooldown = cooldown
        if action_type in ['scroll', 'drag', 'move']:
            actual_cooldown = 0.03 # 33Hz throttle rate

        if now - last_time < actual_cooldown:
            return False

        success = True

        try:
            if action_type == 'left_click':
                print("[Executor] Executing Win32 Left Click" if IS_WINDOWS else "[Executor] Executing PyAutoGUI Left Click")
                if IS_WINDOWS:
                    ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                    ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                else:
                    pyautogui.click()

            elif action_type == 'right_click':
                print("[Executor] Executing Win32 Right Click" if IS_WINDOWS else "[Executor] Executing PyAutoGUI Right Click")
                if IS_WINDOWS:
                    ctypes.windll.user32.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
                    ctypes.windll.user32.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
                else:
                    pyautogui.click(button='right')

            elif action_type == 'double_click':
                print("[Executor] Executing Win32 Double Click" if IS_WINDOWS else "[Executor] Executing PyAutoGUI Double Click")
                if IS_WINDOWS:
                    ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                    ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                    time.sleep(0.05)
                    ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                    ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                else:
                    pyautogui.doubleClick()

            elif action_type == 'drag':
                if not self.is_dragging:
                    print("[Executor] Pressing Left Mouse Down (Drag Start)")
                    if IS_WINDOWS:
                        ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                    else:
                        pyautogui.mouseDown()
                    self.is_dragging = True

            elif action_type == 'scroll':
                direction = action_parameters.get("direction", "down")
                amount = int(action_parameters.get("amount", 2))
                scroll_value = amount * 120 if direction == "up" else -amount * 120
                print(f"[Executor] Scrolling {direction} ({scroll_value})")
                if IS_WINDOWS:
                    # dwData uses third parameter of mouse_event
                    ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, scroll_value, 0)
                else:
                    pyautogui.scroll(scroll_value)

            elif action_type == 'shortcut':
                keys = action_parameters.get("keys", [])
                if keys:
                    print(f"[Executor] Triggering Hotkey: {keys}")
                    pyautogui.hotkey(*keys)

            elif action_type == 'media':
                command = action_parameters.get("command", "play_pause")
                print(f"[Executor] Pressing media command: {command}")
                if command == "next":
                    pyautogui.press('nexttrack')
                elif command == "previous":
                    pyautogui.press('prevtrack')
                elif command == "play_pause":
                    pyautogui.press('playpause')
                elif command == "volume_up":
                    pyautogui.press('volumeup')
                elif command == "volume_down":
                    pyautogui.press('volumedown')

            elif action_type == 'app_launch':
                app = action_parameters.get("app", "calc")
                print(f"[Executor] Launching application: {app}")
                if os.name == 'nt':
                    subprocess.Popen(app, shell=True)
                else:
                    subprocess.Popen(app)

            else:
                success = False

        except Exception as e:
            print(f"[Executor] Execution Exception ({action_type}): {e}")
            success = False

        # Only update states on successful execution
        if success:
            self.last_execution_times[action_name] = now
            if is_instant:
                self.last_gesture = gesture_key

        return success

    def terminate_continuous_actions(self):
        """
        Failsafe reset that releases mouse dragging when hand landmarks are lost or gesture changes.
        """
        if self.is_dragging:
            print("[Executor] Releasing Mouse Left Up (Drag End)")
            try:
                if IS_WINDOWS:
                    ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                else:
                    pyautogui.mouseUp()
            except Exception as e:
                print(f"[Executor] mouseUp Failsafe Error: {e}")
            self.is_dragging = False
