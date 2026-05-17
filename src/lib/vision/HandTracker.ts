import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load the Vision WASM binaries from Google CDN
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );

      // Create the Hand Landmarker instance
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU" // Hardware acceleration
        },
        runningMode: "VIDEO",
        numHands: 1, // Only track one hand for the cursor
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize MediaPipe Hand Landmarker:", error);
      throw error;
    }
  }

  /**
   * Process a video frame and return hand landmarks.
   */
  detect(video: HTMLVideoElement, timestampMs: number): HandLandmarkerResult | null {
    if (!this.landmarker || !this.isInitialized) return null;
    try {
      return this.landmarker.detectForVideo(video, timestampMs);
    } catch (error) {
      console.error("Error detecting hand landmarks:", error);
      return null;
    }
  }

  /**
   * Cleans up the landmarker instance.
   */
  close() {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
      this.isInitialized = false;
    }
  }
}
