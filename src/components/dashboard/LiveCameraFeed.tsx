import { Camera, Crosshair, Video, VideoOff, Activity, Zap } from 'lucide-react';
import { useAiStream } from '../../hooks/useAiStream';
import { cn } from '../../lib/utils';
import { useEffect, useRef, useState } from 'react';
import { cursorService } from '../../services/cursorService';

export function LiveCameraFeed() {
  const { data } = useAiStream();
  const isTracking = data.trackingStatus === 'Active';
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setCameraError(null);
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setCameraError("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Auto-init camera
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Real-time Skeleton and Cursor Animation Loop
  useEffect(() => {
    if (!isCameraActive || !isTracking) return;

    let animationFrame: number;
    const ctx = canvasRef.current?.getContext('2d');

    const render = () => {
      if (ctx && canvasRef.current) {
        const { width, height } = canvasRef.current;
        ctx.clearRect(0, 0, width, height);

        // Draw Simulated Skeleton
        // In a real MediaPipe integration, we would loop through data.landmarks
        if (data.landmarkCount > 0) {
          ctx.strokeStyle = '#1E3A5F';
          ctx.lineWidth = 2;
          ctx.fillStyle = '#16A34A';

          // Simulate some points for visual feedback
          const points = [
            { x: width * 0.5, y: height * 0.5 },
            { x: width * 0.45, y: height * 0.4 },
            { x: width * 0.55, y: height * 0.4 },
          ];

          points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
          });

          // Update Cursor Service (Mocking hand-to-cursor mapping)
          cursorService.updateTarget(0.5 + Math.random() * 0.01, 0.5 + Math.random() * 0.01);
        }
      }
      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [isCameraActive, isTracking, data.landmarkCount]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-accent p-4 md:p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/5 rounded-xl">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Live AI Interaction</h2>
            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Engine: Vision_ResNet_v4</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
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
            {isCameraActive ? "Disconnect" : "Initialize Engine"}
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-background rounded-2xl overflow-hidden border border-accent/50 min-h-[400px] flex items-center justify-center shadow-inner group">
        {cameraError ? (
          <div className="text-error text-sm font-bold p-8 text-center bg-error/5 rounded-2xl border border-error/10 max-w-xs">
            <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
            {cameraError}
          </div>
        ) : (
          <>
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              className={cn(
                "absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-700",
                isCameraActive ? "opacity-100" : "opacity-0"
              )}
            />
            
            <canvas 
              ref={canvasRef}
              width={1280}
              height={720}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100"
            />

            {/* AI HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                    <div className={cn("w-2 h-2 rounded-full", isTracking ? "bg-success animate-pulse" : "bg-error")} />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Tracking: {data.trackingStatus}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">{data.fps.toFixed(1)} FPS</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 text-right">
                   <div className="px-3 py-1 bg-primary/20 backdrop-blur-md rounded border border-primary/30">
                      <p className="text-[10px] font-bold text-white uppercase tracking-tighter">Inference Time</p>
                      <p className="text-sm font-bold text-white">{data.inferenceTimeMs.toFixed(1)}ms</p>
                   </div>
                </div>
              </div>

              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-md transition-all">
                  <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 mb-4 animate-bounce">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-primary font-bold text-lg">System Standby</p>
                  <p className="text-text-secondary text-sm font-medium">Click initialize to start AI inference</p>
                </div>
              )}

              {isCameraActive && isTracking && (
                <div className="relative w-full h-full flex items-center justify-center">
                  <Crosshair className="w-20 h-20 text-white/20 animate-pulse" />
                  {data.gesture !== 'None' && (
                    <div className="absolute border-2 border-primary w-56 h-72 rounded-2xl bg-primary/5 backdrop-blur-[2px] transition-all duration-300 flex items-start justify-end p-3 shadow-2xl shadow-primary/20 ring-1 ring-white/20">
                       <div className="bg-primary text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-xl uppercase tracking-widest">
                         {data.gesture} {(data.confidence).toFixed(0)}%
                       </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Active Stream</p>
                  <p className="text-xs font-bold text-white">Local Node: PC_DEV_01</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Resolution</p>
                  <p className="text-xs font-bold text-white">1280 x 720 (720p)</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
