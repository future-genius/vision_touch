import os
import subprocess
import pyautogui
import time

class ActionExecutor:
    def __init__(self):
        # Prevent PyAutoGUI exceptions
        pyautogui.FAILSAFE = False
        
        # Keep track of active states (e.g., drag and drop)
        self.is_dragging = False
        self.last_execution_times = {} # action_name -> float timestamp

    def execute(self, action_type, action_parameters=None, cooldown=0.4, action_name="default"):
        """
        Executes a gesture action if the cooldown period has elapsed.
        """
        if action_parameters is None:
            action_parameters = {}
            
        now = time.time()
        last_time = self.last_execution_times.get(action_name, 0.0)
        
        # Bypass or lower cooldown for smooth continuous actions (scroll, zoom, drag)
        actual_cooldown = cooldown
        if action_type in ['scroll', 'zoom', 'drag']:
            actual_cooldown = 0.05  # sub-50ms execution for hyper-responsiveness
            
        if now - last_time < actual_cooldown:
            # Cooldown active, throttle execution
            return False

        self.last_execution_times[action_name] = now
        success = True

        try:
            if action_type == 'left_click':
                print(f"[Executor] Executing Left Click")
                pyautogui.click()
                
            elif action_type == 'right_click':
                print(f"[Executor] Executing Right Click")
                pyautogui.click(button='right')
                
            elif action_type == 'double_click':
                print(f"[Executor] Executing Double Click")
                pyautogui.doubleClick()
                
            elif action_type == 'drag':
                if not self.is_dragging:
                    print(f"[Executor] Starting Drag & Drop (Mouse Down)")
                    pyautogui.mouseDown()
                    self.is_dragging = True
                # Continuous mode handled in main loop
                
            elif action_type == 'scroll':
                direction = action_parameters.get("direction", "down")
                amount = int(action_parameters.get("amount", 3))
                scroll_value = amount * 100 if direction == "up" else -amount * 100
                print(f"[Executor] Scrolling {direction} ({scroll_value})")
                pyautogui.scroll(scroll_value)
                
            elif action_type == 'zoom':
                direction = action_parameters.get("direction", "in")
                print(f"[Executor] Zooming {direction}")
                if direction == "in":
                    # Ctrl + Plus
                    pyautogui.hotkey('ctrl', '=')
                else:
                    # Ctrl + Minus
                    pyautogui.hotkey('ctrl', '-')
                    
            elif action_type == 'shortcut':
                keys = action_parameters.get("keys", [])
                if keys:
                    print(f"[Executor] Pressing shortcut hotkey: {keys}")
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
                # Use subprocess to launch asynchronously without blocking engine
                if os.name == 'nt': # Windows
                    subprocess.Popen(app, shell=True)
                else:
                    subprocess.Popen(app)
                    
            else:
                print(f"[Executor] Unknown action type: {action_type}")
                success = False

        except Exception as e:
            print(f"[Executor] Error running action {action_type}: {e}")
            success = False
            
        return success

    def terminate_continuous_actions(self):
        """
        Safely stops any continuous states (like Drag and Drop) when a gesture is lost.
        """
        if self.is_dragging:
            print(f"[Executor] Releasing Drag & Drop (Mouse Up)")
            try:
                pyautogui.mouseUp()
            except Exception as e:
                print(f"[Executor] MouseUp Error: {e}")
            self.is_dragging = False
