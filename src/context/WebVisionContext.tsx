import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { HandTracker } from '../lib/vision/HandTracker';

interface CursorState {
  x: number;
  y: number;
  isPinching: boolean;
  isVisible: boolean;
}

interface WebVisionContextType {
  isActive: boolean;
  isInitializing: boolean;
  cursor: CursorState;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  error: string | null;
}

const WebVisionContext = createContext<WebVisionContextType | undefined>(undefined);

// Smoothing buffer for cursor
const HISTORY_SIZE = 5;

export function WebVisionProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [cursor, setCursor] = useState<CursorState>({ x: 0, y: 0, isPinching: false, isVisible: false });
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  
  // Smoothing queues
  const xHistory = useRef<number[]>([]);
  const yHistory = useRef<number[]>([]);

  // Initialize the video element off-screen to capture stream
  useEffect(() => {
    const video = document.createElement('video');
    // Mobile browsers strictly require muted=true to programmatically play video
    video.muted = true;
    video.playsInline = true;
    // Position off-screen instead of display:none so mobile Safari doesn't throttle the frames
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    
    document.body.appendChild(video);
    videoRef.current = video;

    return () => {
      document.body.removeChild(video);
    };
  }, []);

  const calculateDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  const smoothCoordinate = (newVal: number, history: number[]) => {
    history.push(newVal);
    if (history.length > HISTORY_SIZE) history.shift();
    return history.reduce((a, b) => a + b, 0) / history.length;
  };

  const processFrame = useCallback(() => {
    if (!videoRef.current || !trackerRef.current || !isActive) return;

    const video = videoRef.current;
    
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      
      const result = trackerRef.current.detect(video, performance.now());
      
      if (result && result.landmarks.length > 0) {
        const hand = result.landmarks[0]; // Primary hand
        
        // Index 8: Index Finger Tip
        // Index 4: Thumb Tip
        const indexTip = hand[8];
        const thumbTip = hand[4];
        
        // Mirrored coordinate system (1 - x) because the camera is a mirror
        const rawX = 1 - indexTip.x;
        const rawY = indexTip.y;
        
        // Map to window coordinates
        const targetX = rawX * window.innerWidth;
        const targetY = rawY * window.innerHeight;
        
        const smoothedX = smoothCoordinate(targetX, xHistory.current);
        const smoothedY = smoothCoordinate(targetY, yHistory.current);
        
        // Calculate pinch distance in normalized space
        const pinchDist = calculateDistance(indexTip, thumbTip);
        const isPinching = pinchDist < 0.05; // 5% of bounding box distance
        
        setCursor({
          x: smoothedX,
          y: smoothedY,
          isPinching,
          isVisible: true
        });
      } else {
        setCursor(prev => ({ ...prev, isVisible: false }));
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isActive]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsInitializing(true);

      // 1. Instantly request camera permission first to give the user immediate visual feedback!
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user' 
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 2. Initialize MediaPipe ML engine in parallel
      if (!trackerRef.current) {
        trackerRef.current = new HandTracker();
        await trackerRef.current.initialize();
      }
      
      setIsActive(true);
      setIsInitializing(false);
      
      // Start processing loop
      animationFrameRef.current = requestAnimationFrame(processFrame);
      
    } catch (err: any) {
      setError(err.message || "Failed to access camera");
      setIsInitializing(false);
      console.error(err);
    }
  };

  const stopCamera = () => {
    setIsActive(false);
    setCursor(prev => ({ ...prev, isVisible: false }));
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (trackerRef.current) {
        trackerRef.current.close();
      }
    };
  }, []);

  return (
    <WebVisionContext.Provider value={{ isActive, isInitializing, cursor, startCamera, stopCamera, error }}>
      {children}
    </WebVisionContext.Provider>
  );
}

export const useWebVision = () => {
  const context = useContext(WebVisionContext);
  if (context === undefined) {
    throw new Error('useWebVision must be used within a WebVisionProvider');
  }
  return context;
};
