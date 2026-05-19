import { Camera, Crosshair, Video, VideoOff, Activity, Zap, RefreshCw } from 'lucide-react';
import { useAiStream } from '../../hooks/useAiStream';
import { cn } from '../../lib/utils';
import { useEffect, useRef, useState } from 'react';

export function LiveCameraFeed() {
  const { 
    data, 
    isConnected, 
    initializeEngine, 
    disconnectEngine, 
    triggerHotReload 
  } = useAiStream();
  
  const isTracking = data.trackingStatus === 'Active';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const startCamera = () => {
    setIsCameraActive(true);
    setCameraError(null);
    initializeEngine();
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    disconnectEngine();
  };

  // Create a hidden video element for local rendering
  useEffect(() => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    videoRef.current = video;
    return () => {
      if (video) video.pause();
    };
  }, []);

  // Manage local camera stream binding
  useEffect(() => {
    let active = true;
    
    const openCamera = async () => {
      if (!isCameraActive) return;
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } }
          });
        } catch (constraintErr) {
          console.warn("Strict constraints failed, falling back to default video stream:", constraintErr);
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        
        if (active) {
          setLocalStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(err => console.error("Error playing local video:", err));
          }
        }
      } catch (err) {
        console.error("Camera access failed:", err);
        if (active) {
          setCameraError("Camera blocked. Please allow browser webcam access or check device drivers.");
        }
      }
    };

    if (isCameraActive) {
      openCamera();
    } else {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
    }

    return () => {
      active = false;
    };
  }, [isCameraActive]);

  // Sync camera UI state with connection status
  useEffect(() => {
    if (isConnected) {
      setIsCameraActive(true);
    } else {
      setIsCameraActive(false);
    }
  }, [isConnected]);

  // Keep localStream in a ref to avoid re-triggering cleanup on state updates
  const localStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      disconnectEngine();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [disconnectEngine]);

  // Real-time Skeletal Rendering Canvas Loop
  useEffect(() => {
    if (!isCameraActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const drawHand = () => {
      // 1. Draw the live webcam frame (if active)
      if (videoRef.current && videoRef.current.readyState >= 2) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Draw the neural skeletal overlay
      if (isTracking && data.landmarks && data.landmarks.length === 21) {
        const pts = data.landmarks;
        const w = canvas.width;
        const h = canvas.height;

        // Draw connections
        ctx.strokeStyle = '#3B82F6'; // Cyber blue line
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const drawSegment = (indices: number[]) => {
          ctx.beginPath();
          ctx.moveTo(pts[indices[0]].x * w, pts[indices[0]].y * h);
          for (let i = 1; i < indices.length; i++) {
            ctx.lineTo(pts[indices[i]].x * w, pts[indices[i]].y * h);
          }
          ctx.stroke();
        };

        // MediaPipe skeletal connections
        drawSegment([0, 1, 2, 3, 4]); // Thumb
        drawSegment([0, 5, 6, 7, 8]); // Index Finger
        drawSegment([9, 10, 11, 12]); // Middle Finger
        drawSegment([13, 14, 15, 16]); // Ring Finger
        drawSegment([0, 17, 18, 19, 20]); // Pinky
        drawSegment([5, 9, 13, 17]); // Palm joint boundary

        // Draw Joints
        pts.forEach((pt, index) => {
          ctx.beginPath();
          ctx.arc(pt.x * w, pt.y * h, 7, 0, Math.PI * 2);
          
          // Color code special nodes (Wrist = primary, Fingertips = green, others = blue)
          if (index === 0) {
            ctx.fillStyle = '#1E3A8A'; // Deep Navy
          } else if ([4, 8, 12, 16, 20].includes(index)) {
            ctx.fillStyle = '#22C55E'; // Emerald tips
          } else {
            ctx.fillStyle = '#60A5FA'; // Light Blue
          }
          ctx.fill();
          
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }

      animationFrameId = requestAnimationFrame(drawHand);
    };

    drawHand();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isCameraActive, isTracking, data.landmarks, localStream]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-accent p-4 md:p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/5 rounded-xl">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Live Neural Telemetry</h2>
            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
              {isConnected ? 'NODE STATUS: CONNECTED' : 'NODE STATUS: DISCONNECTED'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={triggerHotReload}
              title="Hot reload gesture database mappings"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={isCameraActive ? stopCamera : startCamera}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
              isCameraActive 
                ? "bg-error/10 text-error hover:bg-error/20 border border-error/20" 
                : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
            )}
          >
            {isCameraActive ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            {isCameraActive ? "Deactivate" : "Initialize Engine"}
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden min-h-[400px] flex items-center justify-center shadow-inner group">
        <>
          {/* Premium Animated High-Tech Neural Grid Background */}
          {isCameraActive && (
            <div className="absolute inset-0 bg-slate-950 overflow-hidden pointer-events-none">
              {/* Radial Grid */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle, #3B82F6 1.5px, transparent 1.5px)',
                  backgroundSize: '32px 32px'
                }}
              />
              
              {/* Animated Horizontal Scanline Sweep */}
              <div 
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-40 shadow-[0_0_12px_#3B82F6]" 
                style={{
                  animation: 'scan 4s linear infinite',
                  top: '0%'
                }}
              />

              {/* Cyber Target Rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-primary/10 rounded-full animate-[spin_30s_linear_infinite]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-dashed border-primary/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-primary/5 rounded-full" />
            </div>
          )}
          
          <canvas 
            ref={canvasRef}
            width={1280}
            height={720}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100"
          />

          {/* If webcam is locked by backend, show status badge instead of error screen */}
          {cameraError && isConnected && (
            <div className="absolute top-16 left-6 z-20 flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 backdrop-blur-md rounded-lg border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
              <Activity className="w-3.5 h-3.5" />
              Direct OS Feed (Webcam Shared via WebSocket)
            </div>
          )}

          {/* Live Skeletal Tracking HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-10">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                    <div className={cn("w-2 h-2 rounded-full", isTracking ? "bg-success animate-pulse" : "bg-red-500")} />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                      Tracker: {data.trackingStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">{data.fps} FPS</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 text-right">
                   <div className="px-3 py-1 bg-primary/30 backdrop-blur-md rounded-lg border border-primary/40">
                      <p className="text-[10px] font-bold text-white/80 uppercase tracking-tighter">Inference Delay</p>
                      <p className="text-sm font-bold text-white">{data.inferenceTimeMs.toFixed(1)}ms</p>
                   </div>
                </div>
              </div>

              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-sm transition-all">
                  <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 mb-4">
                    <Camera className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <p className="text-white font-bold text-lg">System Off-Duty</p>
                  <p className="text-slate-400 text-sm font-medium mt-1">Activate the engine to spin up computer vision tracking</p>
                </div>
              )}

              {isCameraActive && isTracking && (
                <div className="relative w-full h-full flex items-center justify-center">
                  <Crosshair className="w-16 h-16 text-white/15 animate-spin" />
                  
                  {/* Predicted Gesture Tag Overlay */}
                  {data.gesture !== 'None' && (
                    <div className="absolute border border-success/40 w-52 h-64 rounded-2xl bg-success/5 backdrop-blur-[1px] transition-all duration-300 flex items-start justify-end p-3 shadow-2xl ring-1 ring-white/10 animate-pulse">
                       <div className="bg-success text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-xl uppercase tracking-widest">
                         {data.gesture} {data.confidence.toFixed(0)}%
                       </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-end text-white">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Action Execution</p>
                  <p className="text-xs font-bold bg-slate-800/80 px-2.5 py-1 rounded border border-white/5 uppercase">
                    Status: <span className={cn(data.actionState !== 'None' && 'text-success font-black')}>{data.actionState}</span>
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Telemetry Output</p>
                  <p className="text-xs font-bold bg-slate-800/80 px-2.5 py-1 rounded border border-white/5">
                    Coord: ({data.cursorX}, {data.cursorY})
                  </p>
                </div>
              </div>
            </div>
          </>
      </div>
    </div>
  );
}
