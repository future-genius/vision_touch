import { useEffect, useState } from 'react';
import { Shield, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAiStream } from '../../hooks/useAiStream';

interface CinematicSplashProps {
  onComplete: () => void;
}

export function CinematicSplash({ onComplete }: CinematicSplashProps) {
  const { isConnected } = useAiStream();
  const [phase, setPhase] = useState<'scanning' | 'loading' | 'finishing' | 'ready'>('scanning');
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // Splash sequence timeline
  useEffect(() => {
    // Add logs progressively
    const logsSequence = [
      'Establishing connection to local AI node...',
      'VisionTouch WebSockets binding to port 8765...',
      'Initializing offline MediaPipe neural frameworks...',
      'Activating dual-hand Kalman filters...',
      'Polling local hardware configuration...',
      'Spatial gaze-assist coordinates calibrated.',
      'VisionTouch Enterprise fully operational.'
    ];

    let logIdx = 0;
    const logInterval = setInterval(() => {
      if (logIdx < logsSequence.length) {
        setLogs(prev => [...prev, logsSequence[logIdx]]);
        logIdx++;
        setProgress(p => Math.min(100, p + 15));
      } else {
        clearInterval(logInterval);
      }
    }, 600);

    const transitionTimer = setTimeout(() => {
      setPhase('loading');
    }, 2000);

    const finishTimer = setTimeout(() => {
      setPhase('finishing');
      setProgress(100);
    }, 4000);

    const readyTimer = setTimeout(() => {
      setPhase('ready');
      onComplete();
    }, 5200);

    return () => {
      clearInterval(logInterval);
      clearTimeout(transitionTimer);
      clearTimeout(finishTimer);
      clearTimeout(readyTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden font-sans select-none">
      
      {/* Sci-Fi Holographic Scanning Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Laser Scanning Line Animation */}
      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60 animate-[bounce_4s_infinite] shadow-[0_0_15px_#1E3A5F]"></div>

      {/* Glow Rings in Center */}
      <div className="relative flex items-center justify-center w-72 h-72">
        <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_12s_linear_infinite] border-dashed"></div>
        <div className="absolute w-64 h-64 border border-blue-500/10 rounded-full animate-[spin_8s_linear_infinite]"></div>
        <div className="absolute w-56 h-56 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-[spin_3s_linear_infinite]"></div>
        
        {/* Core AI Orb */}
        <div className="relative flex items-center justify-center w-40 h-40 rounded-full bg-slate-900 border border-white/10 shadow-[0_0_50px_rgba(30,58,95,0.3)]">
          <div className="flex flex-col items-center">
            <Shield className="w-10 h-10 text-primary animate-pulse" />
            <h1 className="text-lg font-black tracking-[0.25em] text-white uppercase mt-2 select-none">VISION</h1>
            <span className="text-[9px] font-bold text-slate-400 tracking-[0.4em] uppercase">TOUCH</span>
          </div>
        </div>
      </div>

      {/* Title & Telemetry Header */}
      <div className="text-center mt-8 z-10 max-w-md w-full px-6">
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
          <span>AI Engine State: {phase === 'ready' ? 'Operational' : 'Calibrating'}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/5">
          <div 
            className="bg-gradient-to-r from-primary to-blue-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_#1E3A5F]"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Live System Diagnostics Console Log */}
      <div className="mt-8 bg-slate-900/60 border border-white/5 rounded-2xl p-4 w-[420px] h-40 overflow-hidden font-mono text-[10px] text-slate-400 shadow-inner flex flex-col justify-end gap-1.5 backdrop-blur-md">
        {logs.map((log, i) => (
          <div 
            key={i} 
            className={`flex items-center gap-2 transform translate-y-0 transition-all duration-300 ${
              i === logs.length - 1 ? 'text-primary font-bold animate-[pulse_1s_infinite]' : ''
            }`}
          >
            {i === logs.length - 1 ? (
              <RefreshCw className="w-3 h-3 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            )}
            <span>{log}</span>
          </div>
        ))}
      </div>

      {/* Network Status Badge */}
      <div className="absolute bottom-6 flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-white/5 bg-slate-900/50 backdrop-blur-sm">
        <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-amber-500 animate-ping'}`}></div>
        <span className="text-[10px] uppercase tracking-widest text-slate-300">
          {isConnected ? 'Sync Link Live' : 'Establishing Handshake...'}
        </span>
      </div>
    </div>
  );
}
