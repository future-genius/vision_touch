interface Point {
  x: number;
  y: number;
}

interface CursorConfig {
  sensitivity: number;
  smoothing: number; // 0 to 1, higher = smoother but more lag
  deadZone: number; // pixel radius to ignore small movements
}

class CursorService {
  private currentPos: Point = { x: 0, y: 0 };
  private targetPos: Point = { x: 0, y: 0 };
  private config: CursorConfig = {
    sensitivity: 1.5,
    smoothing: 0.6,
    deadZone: 5,
  };

  constructor() {
    this.currentPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  /**
   * Maps normalized coordinates (0-1) to screen coordinates with smoothing.
   */
  public updateTarget(normalizedX: number, normalizedY: number) {
    // Invert X for mirror effect
    const targetX = (1 - normalizedX) * window.innerWidth * this.config.sensitivity;
    const targetY = normalizedY * window.innerHeight * this.config.sensitivity;

    this.targetPos = { x: targetX, y: targetY };
    this.applySmoothing();
  }

  private applySmoothing() {
    const dx = this.targetPos.x - this.currentPos.x;
    const dy = this.targetPos.y - this.currentPos.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.config.deadZone) {
      // Linear interpolation (LERP)
      const lerpFactor = 1 - this.config.smoothing;
      this.currentPos.x += dx * lerpFactor;
      this.currentPos.y += dy * lerpFactor;
    }
  }

  public getPosition(): Point {
    return {
      x: Math.round(this.currentPos.x),
      y: Math.round(this.currentPos.y),
    };
  }

  public setConfig(newConfig: Partial<CursorConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

export const cursorService = new CursorService();
