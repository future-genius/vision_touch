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

      try {
        // Try with GPU hardware acceleration and sensitive thresholds
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      } catch (gpuError) {
        console.warn("WebGL/GPU hand landmarker delegate failed, falling back to CPU:", gpuError);
        // Fallback to CPU execution
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/hand_landmarker.task",
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      }

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
