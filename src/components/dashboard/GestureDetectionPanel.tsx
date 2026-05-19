import { Hand, Zap, Activity, Hexagon } from 'lucide-react';
import { useAiStream } from '../../hooks/useAiStream';
import { cn } from '../../lib/utils';

export function GestureDetectionPanel() {
  const { data } = useAiStream();
  const isActive = data.trackingStatus === 'Active';

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-accent p-8 flex flex-col h-full relative overflow-hidden">
      {!isActive && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-6">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-text-secondary opacity-30" />
          </div>
          <h3 className="text-xl font-black text-primary tracking-tighter uppercase">Engine Standby</h3>
          <p className="text-xs text-text-secondary max-w-[180px] mt-2">Initialize the camera to start real-time neural inference</p>
        </div>
      )}

      <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-8">
        <Hand className="w-5 h-5 text-primary" />
        Gesture Detection
      </h2>

      <div className="flex-1 flex flex-col justify-center space-y-10">
        <div className="text-center">
          <p className="text-[10px] text-text-secondary font-black mb-2 uppercase tracking-[0.2em]">Current Gesture</p>
          <div className="text-5xl font-black text-primary mb-4 tracking-tighter min-h-[60px]">
            {data.gesture !== 'None' ? data.gesture : <span className="text-text-secondary/20">Listening...</span>}
          </div>
          
          <div className="max-w-[200px] mx-auto space-y-3">
            <div className="flex justify-between text-[10px] font-black text-text-secondary uppercase">
              <span>Confidence</span>
              <span>{isActive ? data.confidence.toFixed(1) : '0.0'}%</span>
            </div>
            <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500 ease-out",
                  data.confidence > 80 ? "bg-success" : data.confidence > 50 ? "bg-amber-500" : "bg-error"
                )}
                style={{ width: `${isActive ? data.confidence : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-background rounded-2xl border border-accent flex flex-col items-center justify-center text-center group hover:border-primary/20 transition-colors">
            <Hexagon className="w-5 h-5 text-primary mb-1" />
            <span className="text-lg font-black text-primary">{isActive ? data.landmarkCount : 0}</span>
            <span className="text-[10px] text-text-secondary font-black uppercase">Landmarks</span>
          </div>
          <div className="p-4 bg-background rounded-2xl border border-accent flex flex-col items-center justify-center text-center group hover:border-primary/20 transition-colors">
            <Zap className="w-5 h-5 text-primary mb-1" />
            <span className="text-lg font-black text-primary">{isActive ? data.inferenceTimeMs.toFixed(1) : '0.0'} ms</span>
            <span className="text-[10px] text-text-secondary font-black uppercase">Latency</span>
          </div>
          <div className="p-4 bg-background rounded-2xl border border-accent flex flex-col items-center justify-center text-center group hover:border-primary/20 transition-colors">
            <Activity className="w-5 h-5 text-success mb-1" />
            <span className="text-lg font-black text-primary">{isActive ? data.fps : 0} Hz</span>
            <span className="text-[10px] text-text-secondary font-black uppercase">Framerate</span>
          </div>
          <div className="p-4 bg-background rounded-2xl border border-accent flex flex-col items-center justify-center text-center group hover:border-primary/20 transition-colors">
            <span className="text-xs font-black text-primary mt-1 mb-2">
              X: {isActive ? data.cursorX : 0} <br /> Y: {isActive ? data.cursorY : 0}
            </span>
            <span className="text-[10px] text-text-secondary font-black uppercase">Position</span>
          </div>
        </div>

        <div className="p-4 bg-accent/40 rounded-2xl border border-accent flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1">Execution Action</span>
          <span className="text-sm font-black text-primary uppercase">
            {isActive && data.actionState ? data.actionState : 'Idle'}
          </span>
        </div>

        <div className="pt-6 border-t border-accent flex items-center justify-between">
           <span className="text-[10px] font-black text-text-secondary flex items-center gap-2 uppercase tracking-widest">
              <Activity className="w-4 h-4" /> Engine Status
           </span>
           <span className="text-[10px] font-black bg-primary/5 text-primary px-3 py-1 rounded-full border border-primary/10">
             Hybrid Heuristic-ML
           </span>
        </div>
      </div>
    </div>
  );
}
