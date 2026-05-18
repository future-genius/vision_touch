import { useEffect, useRef, useState } from 'react';
import { useWebVision } from '../context/WebVisionContext';
import { Sliders, Minimize2, Maximize2, RotateCw, X } from 'lucide-react';
import { cn } from '../lib/utils';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [5, 9], [9, 10], [10, 11], [11, 12], // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 17] // Palm base connection
];

export function FloatingCameraPreview() {
  const {
    isActive,
    cameraStream,
    landmarks,
    cursor,
    sensitivity,
    setSensitivity,
    smoothing,
    setSmoothing,
    facingMode,
    setFacingMode,
    showPreview,
    setShowPreview
  } = useWebVision();

  const [showSliders, setShowSliders] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Set the stream to the local preview video element
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => console.error("Error playing video stream", err));
    }
  }, [cameraStream, isActive, isMinimized]);

  // Real-time canvas renderer for the hand skeleton joints
  useEffect(() => {
    if (isMinimized || !isActive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!landmarks || landmarks.length === 0) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Joint colors
    const jointColor = cursor.isPinching ? '#ff007f' : '#10b981'; // neon hot pink on click/pinch, emerald green otherwise
    const lineColor = cursor.isPinching ? 'rgba(255, 0, 127, 0.4)' : 'rgba(16, 185, 129, 0.4)';
    
    // 1. Draw connections (skeleton lines)
    ctx.lineWidth = 3;
    ctx.strokeStyle = lineColor;
    
    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const startPoint = landmarks[startIdx];
      const endPoint = landmarks[endIdx];
      
      if (startPoint && endPoint) {
        // Mirrored coordinate system mapping
        const sx = (1 - startPoint.x) * width;
        const sy = startPoint.y * height;
        const ex = (1 - endPoint.x) * width;
        const ey = endPoint.y * height;
        
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    });
    
    // 2. Draw joints (dots)
    landmarks.forEach((pt, idx) => {
      const x = (1 - pt.x) * width;
      const y = pt.y * height;
      
      ctx.beginPath();
      // Draw larger indicators for finger tips
      const isTip = [4, 8, 12, 16, 20].includes(idx);
      ctx.arc(x, y, isTip ? 6 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#ffffff' : jointColor;
      ctx.fill();
      
      // Draw border ring for finger tips
      if (isTip) {
        ctx.strokeStyle = jointColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    
    // 3. Highlight pinch target
    if (cursor.isPinching) {
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];
      if (indexTip && thumbTip) {
        const px = (1 - (indexTip.x + thumbTip.x) / 2) * width;
        const py = ((indexTip.y + thumbTip.y) / 2) * height;
        
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [landmarks, cursor.isPinching, isActive, isMinimized]);

  if (!isActive || !showPreview) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-[9998] flex flex-col font-sans transition-all duration-300",
        isMinimized ? "w-12 h-12 rounded-full overflow-hidden" : "w-64 sm:w-72 rounded-[2rem]"
      )}
    >
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all border border-white/20 animate-bounce"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      ) : (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 shadow-2xl shadow-slate-950/50 flex flex-col gap-4 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header Panel */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Standalone AI Preview</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                title="Switch Camera source"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setShowSliders(!showSliders)}
                title="Adjust Sensitivity"
                className={cn(
                  "p-1.5 rounded-lg active:scale-90 transition-all",
                  showSliders ? "text-primary bg-primary/10" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setIsMinimized(true)}
                title="Minimize Preview"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setShowPreview(false)}
                title="Hide Preview"
                className="p-1.5 rounded-lg text-error/60 hover:text-error hover:bg-error/10 active:scale-90 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Camera Video and Landmarks Drawing Frame */}
          <div className="relative aspect-[4/3] w-full rounded-[1.25rem] overflow-hidden bg-slate-950 border border-white/5 shadow-inner group">
            {/* Mirror the camera feed */}
            <video 
              ref={videoRef}
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />
            {/* Overlay hand skeleton skeleton drawing */}
            <canvas 
              ref={canvasRef}
              width={320}
              height={240}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />
            {/* Tracking Status indicator */}
            <div className="absolute bottom-2 left-2 z-20 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-bold font-mono text-slate-300">
              {landmarks.length > 0 ? (
                <span className="text-success">TRACKING ACTIVE ({landmarks.length} joints)</span>
              ) : (
                <span className="text-amber-500 animate-pulse">LOOKING FOR HAND...</span>
              )}
            </div>
          </div>

          {/* Adjustment Sliders Drawer */}
          {showSliders && (
            <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 animate-in slide-in-from-top-3 duration-200">
              {/* Sensitivity */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                  <span className="text-slate-400">CURSOR SPEED</span>
                  <span className="text-primary">{sensitivity.toFixed(1)}x</span>
                </div>
                <input 
                  type="range"
                  min="0.8"
                  max="3.0"
                  step="0.1"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              
              {/* Damping / Smoothing */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                  <span className="text-slate-400">STABILITY (LERP)</span>
                  <span className="text-primary">{smoothing.toFixed(2)}</span>
                </div>
                <input 
                  type="range"
                  min="0.30"
                  max="0.90"
                  step="0.05"
                  value={smoothing}
                  onChange={(e) => setSmoothing(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
