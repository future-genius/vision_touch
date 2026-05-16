// src/services/mockAiService.ts

export type GestureType = 'Open Hand' | 'Fist' | 'Pinch' | 'Swipe Left' | 'Swipe Right' | 'Point' | 'None';

export interface AiStreamData {
  gesture: GestureType;
  confidence: number;
  fps: number;
  inferenceTimeMs: number;
  landmarkCount: number;
  trackingStatus: 'Active' | 'Lost' | 'Initializing';
}

class MockAiService {
  private listeners: ((data: AiStreamData) => void)[] = [];
  private currentData: AiStreamData = {
    gesture: 'None',
    confidence: 0,
    fps: 30,
    inferenceTimeMs: 15,
    landmarkCount: 0,
    trackingStatus: 'Initializing'
  };
  private intervalId: number | null = null;
  private logListeners: ((log: string) => void)[] = [];

  constructor() {
    this.startSimulation();
  }

  subscribe(callback: (data: AiStreamData) => void) {
    this.listeners.push(callback);
    callback(this.currentData);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  subscribeLogs(callback: (log: string) => void) {
    this.logListeners.push(callback);
    return () => {
      this.logListeners = this.logListeners.filter(cb => cb !== callback);
    };
  }

  private emit(data: AiStreamData) {
    this.currentData = data;
    this.listeners.forEach(cb => cb(data));
  }

  private addLog(message: string) {
    const timestamp = new Date().toISOString();
    this.logListeners.forEach(cb => cb(`[${timestamp}] ${message}`));
  }

  private startSimulation() {
    setTimeout(() => {
      this.addLog('Initializing Camera Feed...');
      setTimeout(() => {
        this.addLog('Camera connected successfully. Resolution: 1280x720');
        this.addLog('Loading MediaPipe Hand tracking model...');
        setTimeout(() => {
          this.addLog('Model loaded. Inference active.');
          this.currentData.trackingStatus = 'Active';
          
          this.intervalId = window.setInterval(() => {
            this.simulateTick();
          }, 100); // 10 ticks per second for UI updates
        }, 1500);
      }, 1000);
    }, 500);
  }

  private simulateTick() {
    const fpsBase = 30 + (Math.random() * 5 - 2.5); // 27.5 to 32.5 fps
    const inferenceTime = 12 + (Math.random() * 6 - 3); // 9 to 15 ms
    
    // Simulate gesture transitions
    const r = Math.random();
    let gesture: GestureType = this.currentData.gesture;
    let confidence = this.currentData.confidence;
    let trackingStatus: 'Active' | 'Lost' = 'Active';
    let landmarkCount = 21;

    if (r < 0.05) {
      const gestures: GestureType[] = ['Open Hand', 'Fist', 'Pinch', 'Swipe Left', 'Swipe Right', 'Point', 'None'];
      gesture = gestures[Math.floor(Math.random() * gestures.length)];
      confidence = 60 + Math.random() * 40; // 60 to 100
      if (gesture !== 'None') {
        this.addLog(`Gesture Detected: ${gesture} (${confidence.toFixed(1)}%)`);
      }
    } else if (gesture !== 'None') {
      confidence = Math.min(100, Math.max(0, confidence + (Math.random() * 4 - 2)));
      if (confidence < 40) {
        gesture = 'None';
        confidence = 0;
      }
    }

    if (Math.random() < 0.02) {
       trackingStatus = 'Lost';
       landmarkCount = 0;
       gesture = 'None';
       confidence = 0;
       if (this.currentData.trackingStatus === 'Active') {
           this.addLog('Warning: Hand tracking lost.');
       }
    } else if (this.currentData.trackingStatus === 'Lost') {
        this.addLog('Hand tracking restored.');
    }

    this.emit({
      gesture,
      confidence,
      fps: fpsBase,
      inferenceTimeMs: inferenceTime,
      landmarkCount,
      trackingStatus
    });
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }
}

export const aiService = new MockAiService();
