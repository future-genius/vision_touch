import { useState } from 'react';
import { Smartphone, Laptop, ShieldCheck, Zap, Globe, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MobileSync() {
  const [token] = useState(() => Math.random().toString(36).substr(2, 9));
  const [inputToken, setInputToken] = useState('');
  const navigate = useNavigate();

  const handleManualConnect = () => {
    if (inputToken.trim()) {
      navigate(`/remote/${inputToken.trim()}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter">Multi-Device Synchronization</h1>
          <p className="text-text-secondary">Link your mobile device as a remote gesture controller</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full border border-success/20">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-black text-success uppercase tracking-widest">Network Ready</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-10">
        {/* Connection Visual */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[40px] border border-accent shadow-xl flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6">
                <Laptop className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-primary">Master PC</h3>
              <p className="text-xs text-text-secondary mt-2 uppercase font-black tracking-widest">Node: vision_desktop_01</p>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-accent shadow-xl flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6">
                <Smartphone className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-primary">Mobile Remote</h3>
              <p className="text-xs text-text-secondary mt-2 uppercase font-black tracking-widest">Awaiting Link...</p>
            </div>
            
            {/* Connection Line */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-2 bg-accent/20 rounded-full hidden md:block overflow-hidden">
               <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>

          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-4 group">
               <div className="p-3 bg-success/10 rounded-xl text-success group-hover:bg-success group-hover:text-white transition-all">
                  <ShieldCheck className="w-5 h-5" />
               </div>
               <div>
                  <h4 className="font-bold text-primary">End-to-End Encrypted</h4>
                  <p className="text-xs text-text-secondary">Your gesture data never leaves your local network.</p>
               </div>
            </div>
            <div className="flex items-center gap-4 group">
               <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Zap className="w-5 h-5" />
               </div>
               <div>
                  <h4 className="font-bold text-primary">Sub-10ms Latency</h4>
                  <p className="text-xs text-text-secondary">Optimized for high-speed professional workflows.</p>
               </div>
            </div>
          </div>
        </div>

        {/* QR Section */}
        <div className="bg-primary p-12 rounded-[50px] shadow-2xl shadow-primary/40 relative overflow-hidden flex flex-col items-center text-center text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
          
          <div className="relative mb-8 p-4 bg-white rounded-[40px] shadow-2xl">
            <div className="w-64 h-64 border-4 border-dashed border-primary/20 rounded-3xl flex flex-col items-center justify-center bg-background p-4 overflow-hidden relative">
              {/* Real Session Token QR Code generated dynamically */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/remote/${token}&color=0f172a&bgcolor=f8fafc`}
                alt="Session QR Code"
                className="w-48 h-48 rounded-xl opacity-90 mix-blend-multiply"
              />
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl whitespace-nowrap">
               Scan with Camera
            </div>
          </div>

          <h2 className="text-3xl font-black tracking-tighter mb-2">Pair Your Device</h2>
          <p className="text-white/70 text-sm max-w-xs mb-4">
            Open your phone's <b>native Camera app</b> to scan, or manually enter the pairing code below if you are already on the PWA.
          </p>
          <div className="bg-white/10 px-4 py-2 rounded-xl mb-8 font-mono tracking-widest font-black text-xl">
             {token}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs relative z-10">
             <input 
               type="text" 
               placeholder="Enter pairing code..." 
               value={inputToken}
               onChange={(e) => setInputToken(e.target.value)}
               className="bg-white/10 border border-white/20 text-white placeholder-white/40 px-4 py-3 rounded-2xl font-mono text-center focus:outline-none focus:bg-white/20 transition-all flex-1"
             />
             <button 
               onClick={handleManualConnect}
               disabled={!inputToken}
               className="bg-white text-primary px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
             >
                <LinkIcon className="w-4 h-4" /> Link
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
