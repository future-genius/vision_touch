import cv2
import numpy as np

class UIOverlay:
    def __init__(self):
        self.font = cv2.FONT_HERSHEY_SIMPLEX

    def draw_hud(self, frame, fps, gesture_name, confidence, landmark_count, action_state, tracking_status, active_zone):
        """
        Draws professional glassmorphism dashboard overlay on CV2 frame
        including status card, tracking boundaries, and performance diagnostics.
        """
        h, w, _ = frame.shape
        
        # 1. Draw Active Zone Box (Comfortable tracking area boundaries)
        min_x = active_zone.get("min_x", 0.30)
        max_x = active_zone.get("max_x", 0.70)
        min_y = active_zone.get("min_y", 0.25)
        max_y = active_zone.get("max_y", 0.65)
        
        pt1 = (int(min_x * w), int(min_y * h))
        pt2 = (int(max_x * w), int(max_y * h))
        
        # Semi-transparent active tracking zone boundary
        overlay = frame.copy()
        cv2.rectangle(overlay, pt1, pt2, (0, 255, 0), 2)
        cv2.putText(overlay, "Active Tracking Zone", (pt1[0] + 5, pt1[1] - 8), self.font, 0.4, (0, 255, 0), 1)
        
        # 2. Draw Telemetry Dashboard Card (Top-Left corner)
        # Background glass box: x from 10 to 280, y from 10 to 180
        cv2.rectangle(overlay, (10, 10), (280, 180), (30, 30, 30), -1)
        
        # Blend the rectangles to give it a modern semi-transparent styling
        cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, frame)
        
        # Add high contrast border to the telemetry card
        cv2.rectangle(frame, (10, 10), (280, 180), (70, 70, 70), 1)

        # 3. Add text overlays
        # Header title
        cv2.putText(frame, "VisionTouch Engine HUD", (20, 30), self.font, 0.5, (0, 255, 255), 1, cv2.LINE_AA)
        cv2.line(frame, (20, 36), (270, 36), (70, 70, 70), 1)
        
        # Telemetry variables
        status_color = (0, 255, 0) if tracking_status == "Active" else (0, 165, 255)
        cv2.putText(frame, f"System Status: {tracking_status}", (20, 55), self.font, 0.45, status_color, 1, cv2.LINE_AA)
        cv2.putText(frame, f"FPS: {fps:.1f}", (20, 75), self.font, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, f"Landmarks: {landmark_count} / 21", (20, 95), self.font, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        
        gesture_text = f"Gesture: {gesture_name}"
        if confidence > 0.0:
            gesture_text += f" ({confidence * 100:.1f}%)"
        cv2.putText(frame, gesture_text, (20, 120), self.font, 0.45, (0, 255, 0) if gesture_name != "None" else (200, 200, 200), 1, cv2.LINE_AA)
        
        # Action log
        action_color = (0, 255, 255) if "Click" in action_state or "Drag" in action_state else (255, 255, 255)
        cv2.putText(frame, f"Action: {action_state}", (20, 145), self.font, 0.45, action_color, 1, cv2.LINE_AA)
        
        # Sub-footer info
        cv2.putText(frame, "Press 'Q' on window to Exit", (20, 170), self.font, 0.35, (150, 150, 150), 1, cv2.LINE_AA)

        # 4. Calibration Instructions overlay if tracking status is Idle
        if tracking_status == "Idle":
            overlay_inst = frame.copy()
            cv2.rectangle(overlay_inst, (w // 2 - 180, h - 50), (w // 2 + 180, h - 10), (0, 0, 0), -1)
            cv2.addWeighted(overlay_inst, 0.6, frame, 0.4, 0, frame)
            cv2.putText(frame, "PLACE HAND IN ACTIVE ZONE TO START TRACKING", (w // 2 - 165, h - 25), self.font, 0.4, (0, 255, 255), 1, cv2.LINE_AA)

        return frame

    def draw_error_overlay(self, frame, error_message):
        """
        Draws critical error overlay centered on the screen.
        """
        h, w, _ = frame.shape
        overlay = frame.copy()
        cv2.rectangle(overlay, (50, h // 2 - 30), (w - 50, h // 2 + 30), (0, 0, 255), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        cv2.putText(frame, f"ERROR: {error_message}", (70, h // 2 + 5), self.font, 0.55, (255, 255, 255), 2, cv2.LINE_AA)
        return frame
