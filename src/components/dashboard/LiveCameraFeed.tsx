import { Camera, Focus, Crosshair } from 'lucide-react';
import { useAiStream } from '../../hooks/useAiStream';
import { cn } from '../../lib/utils';

export function LiveCameraFeed() {
  const { data } = useAiStream();
  const isTracking = data.trackingStatus === 'Active';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-accent p-4 md:p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Live Camera Feed
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium bg-accent text-text-secondary px-2 py-1 rounded-md">
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
        {/* Placeholder for actual WebRTC/OpenCV video feed */}
        <div className="absolute inset-0 flex items-center justify-center bg-text-primary/5">
          {isTracking ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <Crosshair className="w-16 h-16 text-primary/20" />
              {/* Simulated Hand Bounding Box */}
              {data.gesture !== 'None' && (
                <div className="absolute border-2 border-primary/50 w-48 h-64 rounded-lg bg-primary/5 transition-all duration-300 flex items-start justify-end p-2">
                   <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                     {data.gesture} {(data.confidence).toFixed(0)}%
                   </span>
                </div>
              )}
            </div>
          ) : (
             <div className="flex flex-col items-center text-text-secondary gap-3">
                <Focus className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">Waiting for video stream...</p>
             </div>
          )}
        </div>
        
        {/* Bottom Overlay Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-text-primary/20 to-transparent">
          <div className="flex justify-between text-xs text-text-primary drop-shadow-md font-medium">
            <span>Res: 1280x720</span>
            <span>Codec: H.264</span>
          </div>
        </div>
      </div>
    </div>
  );
}
