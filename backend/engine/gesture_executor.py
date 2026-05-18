import os
import subprocess
import pyautogui
import time
from backend.config import settings

class ActionExecutor:
    def __init__(self):
        # Override PyAutoGUI defaults to achieve instant response
        pyautogui.FAILSAFE = settings.FAILSAFE
        pyautogui.PAUSE = settings.PAUSE

        # State tracking (Drag and drop)
        self.is_dragging = False
        self.last_execution_times = {} # action_name -> float timestamp

    def execute(self, action_type, action_parameters=None, cooldown=0.4, action_name="default"):
        """
        Interprets dynamic inputs, validates cooldown timelines, and fires OS executions.
        """
        if action_parameters is None:
            action_parameters = {}

        now = time.time()
        last_time = self.last_execution_times.get(action_name, 0.0)

        # Bypass cooldowns for continuous actions to deliver high responsiveness (scrolling, dragging)
        actual_cooldown = cooldown
        if action_type in ['scroll', 'drag', 'move']:
            actual_cooldown = 0.04 # 25Hz throttle rate

        if now - last_time < actual_cooldown:
            return False

        self.last_execution_times[action_name] = now
        success = True

        try:
            if action_type == 'left_click':
                print("[Executor] Executing Instant Mouse Left Click")
                pyautogui.click()

            elif action_type == 'right_click':
                print("[Executor] Executing Instant Mouse Right Click")
                pyautogui.click(button='right')

            elif action_type == 'double_click':
                print("[Executor] Executing Instant Mouse Double Click")
                pyautogui.doubleClick()

            elif action_type == 'drag':
                if not self.is_dragging:
                    print("[Executor] Pressing Left Mouse Down (Drag Start)")
                    pyautogui.mouseDown()
                    self.is_dragging = True

            elif action_type == 'scroll':
                direction = action_parameters.get("direction", "down")
                amount = int(action_parameters.get("amount", 2))
                scroll_value = amount * 80 if direction == "up" else -amount * 80
                print(f"[Executor] Scrolling {direction} ({scroll_value})")
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
                print(f"[Executor] Launching application asynchronously: {app}")
                if os.name == 'nt':
                    subprocess.Popen(app, shell=True)
                else:
                    subprocess.Popen(app)

            else:
                success = False

        except Exception as e:
            print(f"[Executor] Execution Exception ({action_type}): {e}")
            success = False

        return success

    def terminate_continuous_actions(self):
        """
        Failsafe reset that releases mouse dragging when hand landmarks are lost.
        """
        if self.is_dragging:
            print("[Executor] Releasing Mouse Left Up (Drag End)")
            try:
                pyautogui.mouseUp()
            except Exception as e:
                print(f"[Executor] mouseUp Failsafe Error: {e}")
            self.is_dragging = False
