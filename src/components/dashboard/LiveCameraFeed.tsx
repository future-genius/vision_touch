import { Camera, Focus, Crosshair, Video, VideoOff } from 'lucide-react';
import { useAiStream } from '../../hooks/useAiStream';
import { cn } from '../../lib/utils';
import { useEffect, useRef, useState } from 'react';

export function LiveCameraFeed() {
  const { data } = useAiStream();
  const isTracking = data.trackingStatus === 'Active';
  
  const videoRef = useRef<HTMLVideoElement>(null);
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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-accent p-4 md:p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Live Camera Feed
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={isCameraActive ? stopCamera : startCamera}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
              isCameraActive 
                ? "bg-error/10 text-error hover:bg-error/20" 
                : "bg-primary text-white hover:bg-primary/90"
            )}
          >
            {isCameraActive ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            {isCameraActive ? "Stop Camera" : "Start Camera"}
          </button>
          <span className="text-xs font-medium bg-accent text-text-secondary px-2 py-1 rounded-md hidden sm:inline-block">
            {data.fps.toFixed(1)} FPS
          </span>
          <div className={cn(
            "flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium border",
            isTracking ? "bg-success/10 text-success border-success/20" : "bg-error/10 text-error border-error/20"
          )}>
            <div className={cn("w-2 h-2 rounded-full", isTracking ? "bg-success animate-pulse" : "bg-error")} />
            {data.trackingStatus}
          </div>
        </div>
      </div>

      <div className="relative flex-1 bg-background rounded-lg overflow-hidden border border-accent/50 min-h-[300px] flex items-center justify-center">
        {cameraError ? (
          <div className="text-error text-sm font-medium p-4 text-center">
            {cameraError}
          </div>
        ) : (
          <>
            {/* Real Webcam Video */}
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              className={cn(
                "absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-500",
                isCameraActive ? "opacity-100" : "opacity-0"
              )}
            />

            {/* Overlays */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!isCameraActive && (
                <div className="flex flex-col items-center text-text-secondary gap-3 bg-white/80 p-6 rounded-xl shadow-sm backdrop-blur-sm">
                  <Video className="w-12 h-12 text-primary/50" />
                  <p className="text-sm font-medium">Click "Start Camera" to view stream</p>
                </div>
              )}

              {isCameraActive && isTracking && (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Central Crosshair */}
                  <Crosshair className="w-16 h-16 text-primary/40 animate-pulse" />
                  
                  {/* Simulated Hand Bounding Box (position would be dynamic with real AI) */}
                  {data.gesture !== 'None' && (
                    <div className="absolute border-2 border-primary/80 w-48 h-64 rounded-lg bg-primary/10 transition-all duration-300 flex items-start justify-end p-2 shadow-[0_0_15px_rgba(30,58,95,0.2)]">
                       <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm backdrop-blur-sm">
                         {data.gesture} {(data.confidence).toFixed(0)}%
                       </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Bottom Overlay Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex justify-between text-xs text-white drop-shadow-md font-medium">
            <span>Res: {isCameraActive ? '1280x720' : 'Offline'}</span>
            <span>Codec: WebRTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
