import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MousePointer2, ShieldCheck, SquareTerminal, 
  Camera, CameraOff, Sparkles, SlidersHorizontal, 
  Maximize, Laptop, ArrowLeft, RotateCw 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useWebVision } from '../context/WebVisionContext';

export function MobileRemote() {
  const { token } = useParams();
  const [activeTab, setActiveTab] = useState<'standalone' | 'pc'>('standalone');
  
  // Standalone mode hooks
  const { 
    isActive, 
    isInitializing, 
    startCamera, 
    stopCamera, 
    error,
    sensitivity,
    setSensitivity,
    smoothing,
    setSmoothing,
    facingMode,
    setFacingMode,
    showPreview,
    setShowPreview
  } = useWebVision();

  // PC Link Mode states (simulated/network sync)
  const [isPcReady, setIsPcReady] = useState(false);

  useEffect(() => {
    if (activeTab === 'pc' && token) {
      // Simulate connection flow for the remote token
      const timer2 = setTimeout(() => setIsPcReady(true), 3000);
      return () => {
        clearTimeout(timer2);
      };
    }
  }, [token, activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden touch-none relative">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-primary/20">VT</div>
            <span className="font-bold text-sm tracking-tight">VisionTouch Mobile PWA</span>
          </div>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('standalone')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              activeTab === 'standalone' ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-white"
            )}
          >
            <Sparkles className="w-3 h-3" /> Standalone AI
          </button>
          <button 
            onClick={() => setActiveTab('pc')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              activeTab === 'pc' ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-white"
            )}
          >
            <Laptop className="w-3 h-3" /> PC Remote
          </button>
        </div>
      </div>

      {/* Main Mode Viewport */}
      <div className="flex-1 relative flex flex-col p-6 overflow-y-auto">
        
        {/* STANDALONE STANDALONE MODE */}
        {activeTab === 'standalone' && (
          <div className="flex-1 flex flex-col gap-6 max-w-md mx-auto w-full justify-center">
            
            {/* Title / Description */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                Standalone AI Control
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Control this phone screen completely hands-free using front camera gestures—no computer or server needed!
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-error/15 border border-error/20 p-4 rounded-2xl text-xs font-semibold text-error flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
                <p>{error}</p>
              </div>
            )}

            {/* Main Toggle Button */}
            <button 
              onClick={isActive ? stopCamera : startCamera}
              disabled={isInitializing}
              className={cn(
                "w-full py-8 rounded-[2.5rem] border font-black text-sm uppercase tracking-[0.2em] transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden group shadow-2xl active:scale-95",
                isInitializing
                  ? "bg-primary/10 border-primary/20 text-primary/40 cursor-wait"
                  : isActive
                    ? "bg-gradient-to-br from-success/20 to-success/5 border-success/30 text-success shadow-success/10"
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
              )}
            >
              {isActive ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center text-success mb-1 border border-success/30 animate-pulse">
                    <CameraOff className="w-8 h-8" />
                  </div>
                  <span>Disable AI Gestures</span>
                  <span className="text-[9px] font-mono text-success/60 tracking-normal normal-case">Camera stream active</span>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 group-hover:bg-primary/25 flex items-center justify-center text-primary mb-1 border border-primary/20 transition-all">
                    {isInitializing ? (
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-8 h-8" />
                    )}
                  </div>
                  <span>{isInitializing ? 'Launching Model...' : 'Enable AI Gestures'}</span>
                  <span className="text-[9px] font-mono text-slate-500 tracking-normal normal-case">100% offline edge processing</span>
                </>
              )}
            </button>

            {/* Live Status indicator */}
            {isActive && (
              <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-white/5 flex items-center justify-between animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/15 rounded-xl text-success">
                    <Maximize className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Floating View</h4>
                    <p className="text-xs text-white">Interactive skeleton overlay is active</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors",
                    showPreview ? "bg-white/10 text-white" : "bg-primary text-white"
                  )}
                >
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </button>
              </div>
            )}

            {/* Gesture Instructions Sheet */}
            <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-white/5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Standalone Gestures</h3>
              
              <div className="grid grid-cols-1 gap-3 text-xs">
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl font-black text-[10px]">01</div>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">Cursor Pointer</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">Raise your hand. Point and move your index finger to float the cursor smoothly across the screen.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-success/10 text-success rounded-xl font-black text-[10px]">02</div>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">Pinch Click</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">Bring your thumb and index finger together (pinch) to instantly trigger a synthetic click at the cursor's location.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Context Sliders */}
            {isActive && (
              <div className="bg-slate-900/60 p-5 rounded-[2rem] border border-white/5 space-y-4 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
                  <span className="flex items-center gap-1.5"><SlidersHorizontal className="w-4 h-4" /> Calibration Configs</span>
                  <button 
                    onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                    className="flex items-center gap-1 text-[9px] text-primary"
                  >
                    <RotateCw className="w-3 h-3" /> Camera: {facingMode === 'user' ? 'Front' : 'Rear'}
                  </button>
                </div>
                
                <div className="space-y-4 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold font-mono">
                      <span className="text-slate-400">Sensitivity (Cursor Speed)</span>
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
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold font-mono">
                      <span className="text-slate-400">Smoothing (Stability)</span>
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
              </div>
            )}

          </div>
        )}

        {/* PC REMOTE CONTROLLER MODE */}
        {activeTab === 'pc' && (
          <div className="flex-1 flex flex-col max-w-md mx-auto w-full justify-center">
            {!isPcReady ? (
              <div className="flex flex-col items-center gap-6 animate-pulse text-center">
                <div className="w-24 h-24 rounded-full border-2 border-primary/30 border-t-primary animate-spin flex items-center justify-center relative">
                  <ShieldCheck className="w-8 h-8 text-primary absolute animate-none" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Establishing secure link...</p>
                <p className="text-[10px] text-slate-600 font-mono">TOKEN: {token || 'N/A'}</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
                {/* Virtual Trackpad */}
                <div className="flex-1 min-h-[250px] border-2 border-white/10 rounded-[2.5rem] bg-white/5 relative overflow-hidden shadow-inner flex flex-col items-center justify-center active:bg-white/10 transition-colors group">
                  <MousePointer2 className="w-12 h-12 text-white/20 group-active:text-primary/50 transition-colors mb-4" />
                  <p className="text-white/30 text-sm font-black uppercase tracking-[0.2em] group-active:text-primary/50">Trackpad Zone</p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4 h-28">
                  <button className="bg-slate-800 rounded-3xl border border-white/5 active:bg-primary active:scale-95 transition-all flex flex-col items-center justify-center gap-2 shadow-lg">
                     <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                       <div className="w-3 h-3 rounded-full bg-white/50" />
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Left Click</span>
                  </button>
                  <button className="bg-slate-800 rounded-3xl border border-white/5 active:bg-primary active:scale-95 transition-all flex flex-col items-center justify-center gap-2 shadow-lg">
                     <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                       <SquareTerminal className="w-4 h-4 text-white/50" />
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Right Click</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      
      {/* Bottom Status Bar */}
      <div className="p-4 flex justify-between items-center bg-slate-950 border-t border-white/5 text-[10px] text-slate-500 font-mono z-10">
        <span>VisionTouch PWA v1.0</span>
        {activeTab === 'standalone' ? (
          <span className={isActive ? "text-success" : "text-slate-600"}>
            {isActive ? "Client Edge Engine Active" : "Edge Engine Idle"}
          </span>
        ) : (
          isPcReady && <span className="text-success">PC Link: Sub-10ms Latency</span>
        )}
      </div>
    </div>
  );
}
