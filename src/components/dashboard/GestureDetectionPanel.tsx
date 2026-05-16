import { Hand, Zap, Activity, Hexagon } from 'lucide-react';
import { useAiStream } from '../../hooks/useAiStream';
import { cn } from '../../lib/utils';

export function GestureDetectionPanel() {
  const { data } = useAiStream();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-accent p-4 md:p-6 flex flex-col h-full">
      <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-6">
        <Hand className="w-5 h-5 text-primary" />
        Gesture Detection
      </h2>

      <div className="flex-1 flex flex-col justify-center space-y-8">
        {/* Main Gesture Display */}
        <div className="text-center">
          <p className="text-sm text-text-secondary font-medium mb-2 uppercase tracking-widest">Current Gesture</p>
          <div className="text-3xl font-bold text-primary mb-2 min-h-[40px]">
            {data.gesture !== 'None' ? data.gesture : <span className="text-text-secondary/50">Listening...</span>}
          </div>
          
          {/* Confidence Bar */}
          <div className="max-w-[200px] mx-auto space-y-2">
            <div className="flex justify-between text-xs font-semibold text-text-secondary">
              <span>Confidence</span>
              <span>{data.confidence.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-300 ease-out",
                  data.confidence > 80 ? "bg-success" : data.confidence > 50 ? "bg-amber-500" : "bg-error"
                )}
                style={{ width: `${data.confidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-background rounded-lg border border-accent/50 flex flex-col items-center justify-center text-center">
            <Hexagon className="w-4 h-4 text-primary mb-1" />
            <span className="text-lg font-bold text-text-primary">{data.landmarkCount}</span>
            <span className="text-xs text-text-secondary font-medium">Landmarks</span>
          </div>
          <div className="p-3 bg-background rounded-lg border border-accent/50 flex flex-col items-center justify-center text-center">
            <Zap className="w-4 h-4 text-primary mb-1" />
            <span className="text-lg font-bold text-text-primary">{data.inferenceTimeMs.toFixed(1)} ms</span>
            <span className="text-xs text-text-secondary font-medium">Inference</span>
          </div>
        </div>

        <div className="pt-4 border-t border-accent flex items-center justify-between">
           <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
              <Activity className="w-4 h-4" /> Model Status
           </span>
           <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
             MediaPipe ResNet50
           </span>
        </div>
      </div>
    </div>
  );
}
