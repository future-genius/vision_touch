import { useContext } from 'react';
import { AiStreamContext } from '../context/AiStreamContext';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface AiData {
  gesture: string;
  gesture_key: string;
  confidence: number;
  fps: number;
  landmarkCount: number;
  landmarks: Point3D[];
  inferenceTimeMs: number;
  trackingStatus: 'Active' | 'Idle' | 'Offline';
  cursorX: number;
  cursorY: number;
  actionState: string;
  isFeeding: boolean;
  feedGestureKey: string | null;
}

export interface SystemLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface PendingPattern {
  landmark_vectors: Point3D[];
  sample_quality: number;
}

export function useAiStream() {
  const context = useContext(AiStreamContext);
  if (context === undefined) {
    throw new Error('useAiStream must be used within an AiStreamProvider');
  }
  return context;
}
