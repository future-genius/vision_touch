import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MousePointer2, Settings, Wifi, ShieldCheck, SquareTerminal } from 'lucide-react';
import { cn } from '../lib/utils';

export function MobileRemote() {
  const { token } = useParams();
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulate connection flow for the remote token
    const timer1 = setTimeout(() => setIsConnected(true), 1500);
    const timer2 = setTimeout(() => setIsReady(true), 3000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden touch-none">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center font-black">VT</div>
          <span className="font-bold text-sm tracking-tight">Remote Link</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors",
            isConnected ? "bg-success/20 text-success" : "bg-amber-500/20 text-amber-500"
          )}>
            <Wifi className="w-3 h-3" />
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
          <Settings className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      {/* Main Trackpad Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-950 to-slate-900">
        {!isReady ? (
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="w-24 h-24 rounded-full border-2 border-primary/30 border-t-primary animate-spin flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary absolute animate-none" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Establishing secure link...</p>
            <p className="text-[10px] text-slate-600 font-mono">TOKEN: {token}</p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Virtual Trackpad */}
            <div className="flex-1 border-2 border-white/10 rounded-[2rem] bg-white/5 relative overflow-hidden shadow-inner flex flex-col items-center justify-center active:bg-white/10 transition-colors group">
              <MousePointer2 className="w-12 h-12 text-white/20 group-active:text-primary/50 transition-colors mb-4" />
              <p className="text-white/30 text-sm font-black uppercase tracking-[0.2em] group-active:text-primary/50">Trackpad Zone</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 h-32">
              <button className="bg-slate-800 rounded-3xl border border-white/5 active:bg-primary active:scale-95 transition-all flex flex-col items-center justify-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                   <div className="w-3 h-3 rounded-full bg-white/50" />
                 </div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Left Click</span>
              </button>
              <button className="bg-slate-800 rounded-3xl border border-white/5 active:bg-primary active:scale-95 transition-all flex flex-col items-center justify-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                   <SquareTerminal className="w-4 h-4 text-white/50" />
                 </div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Right Click</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Status Bar */}
      <div className="p-4 flex justify-between items-center bg-slate-950 border-t border-white/5 text-[10px] text-slate-500 font-mono">
        <span>VisionTouch PWA v1.0</span>
        {isReady && <span className="text-success">Sub-10ms Latency</span>}
      </div>
    </div>
  );
}
