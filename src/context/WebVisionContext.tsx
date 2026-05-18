import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { HandTracker } from '../lib/vision/HandTracker';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

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
  landmarks: Point3D[];
  cameraStream: MediaStream | null;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  sensitivity: number;
  setSensitivity: (val: number) => void;
  smoothing: number;
  setSmoothing: (val: number) => void;
  facingMode: 'user' | 'environment';
  setFacingMode: (mode: 'user' | 'environment') => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  error: string | null;
}

const WebVisionContext = createContext<WebVisionContextType | undefined>(undefined);

export function WebVisionProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [cursor, setCursor] = useState<CursorState>({ x: 0, y: 0, isPinching: false, isVisible: false });
  const [landmarks, setLandmarks] = useState<Point3D[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [sensitivity, setSensitivity] = useState(1.6);
  const [smoothing, setSmoothing] = useState(0.65);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const cursorRef = useRef({ x: 0, y: 0, isVisible: false });
  
  // Initialize the video element off-screen to capture stream
  useEffect(() => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
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
      if (video && document.body.contains(video)) {
        document.body.removeChild(video);
      }
    };
  }, []);

  const calculateDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  const processFrame = useCallback(() => {
    if (!videoRef.current || !trackerRef.current || !isActive) return;

    const video = videoRef.current;
    
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      
      const result = trackerRef.current.detect(video, performance.now());
      
      if (result && result.landmarks.length > 0) {
        const hand = result.landmarks[0]; // Primary hand
        setLandmarks(hand);
        
        // Index 8: Index Finger Tip
        // Index 4: Thumb Tip
        const indexTip = hand[8];
        const thumbTip = hand[4];
        
        // Mirrored coordinate system (1 - x) because the camera is a mirror
        const rawX = 1 - indexTip.x;
        const rawY = indexTip.y;
        
        // Center-focused active zone: scale comfortable central area (0.22 to 0.78) to full screen
        const xMin = 0.22;
        const xMax = 0.78;
        const yMin = 0.22;
        const yMax = 0.78;
        
        let mappedX = (rawX - xMin) / (xMax - xMin);
        let mappedY = (rawY - yMin) / (yMax - yMin);
        
        // Scale coordinate centered around 0.5 using sensitivity
        mappedX = 0.5 + (mappedX - 0.5) * sensitivity;
        mappedY = 0.5 + (mappedY - 0.5) * sensitivity;
        
        const targetX = Math.max(0, Math.min(window.innerWidth, mappedX * window.innerWidth));
        const targetY = Math.max(0, Math.min(window.innerHeight, mappedY * window.innerHeight));
        
        // Adaptive LERP smoothing based on movement velocity
        let smoothedX = targetX;
        let smoothedY = targetY;
        
        if (cursorRef.current.isVisible) {
          const dx = targetX - cursorRef.current.x;
          const dy = targetY - cursorRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Adaptive factor: fast movements have higher LERP factor (more responsive),
          // slow movements have lower LERP factor (more stable and smooth for small clicks)
          const baseLerp = 1.0 - smoothing;
          const lerpFactor = dist > 80 
            ? Math.min(0.85, baseLerp * 1.6) 
            : dist < 10 
              ? Math.max(0.08, baseLerp * 0.4) 
              : Math.max(0.1, baseLerp * 0.75);
              
          smoothedX = cursorRef.current.x + dx * lerpFactor;
          smoothedY = cursorRef.current.y + dy * lerpFactor;
        }
        
        // Calculate pinch distance in normalized space
        const pinchDist = calculateDistance(indexTip, thumbTip);
        const isPinching = pinchDist < 0.045; // 4.5% distance threshold
        
        cursorRef.current = { x: smoothedX, y: smoothedY, isVisible: true };
        
        setCursor({
          x: smoothedX,
          y: smoothedY,
          isPinching,
          isVisible: true
        });
      } else {
        setLandmarks([]);
        cursorRef.current.isVisible = false;
        setCursor(prev => ({ ...prev, isVisible: false }));
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isActive, sensitivity, smoothing]);

  // Restart frame loop when active state or config changes
  useEffect(() => {
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, processFrame]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsInitializing(true);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Vision Engine timed out during initialization. Please check camera permissions, ensure your browser supports WebGL, and refresh.")), 15000)
      );

      const initPromise = (async () => {
        // Request camera permission with facing mode
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 640 }, 
              height: { ideal: 480 }, 
              facingMode: facingMode
            }
          });
        } catch (constraintError) {
          console.warn("Camera constraint failed, falling back to default video stream:", constraintError);
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        
        streamRef.current = stream;
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Initialize MediaPipe ML engine in parallel
        if (!trackerRef.current) {
          trackerRef.current = new HandTracker();
          await trackerRef.current.initialize();
        }
        
        setIsActive(true);
        setIsInitializing(false);
      })();

      await Promise.race([initPromise, timeoutPromise]);
      
    } catch (err: any) {
      setError(err.message || "Failed to access camera or load models");
      setIsInitializing(false);
      console.error(err);
    }
  };

  const stopCamera = () => {
    setIsActive(false);
    setCursor(prev => ({ ...prev, isVisible: false }));
    setLandmarks([]);
    setCameraStream(null);
    cursorRef.current.isVisible = false;
    
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

  // Re-start camera if facingMode is changed while active
  useEffect(() => {
    if (isActive) {
      stopCamera();
      // small delay to let devices release before grabbing again
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [facingMode]);

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
    <WebVisionContext.Provider value={{ 
      isActive, 
      isInitializing, 
      cursor, 
      landmarks,
      cameraStream,
      showPreview,
      setShowPreview,
      sensitivity,
      setSensitivity,
      smoothing,
      setSmoothing,
      facingMode,
      setFacingMode,
      startCamera, 
      stopCamera, 
      error 
    }}>
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
