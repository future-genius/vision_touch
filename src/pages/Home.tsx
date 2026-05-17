import { useAuth } from '../context/AuthContext';
import { useWebVision } from '../context/WebVisionContext';
import { ArrowRight, Zap, Shield, Globe, Camera, CameraOff, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  const { user } = useAuth();
  const { isActive, isInitializing, startCamera, stopCamera, error } = useWebVision();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center p-2 shadow-lg shadow-primary/20 overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <span className="text-2xl font-black text-primary tracking-tighter uppercase hidden sm:block">VisionTouch</span>
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={isActive ? stopCamera : startCamera}
            disabled={isInitializing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              isInitializing
                ? 'bg-primary/5 text-primary/40 cursor-wait'
                : isActive 
                  ? 'bg-success/10 text-success border border-success/20' 
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            {isInitializing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Initializing...</span>
              </>
            ) : (
              <>
                {isActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                <span className="hidden sm:inline">{isActive ? 'Engine Active' : 'Enable Gestures'}</span>
              </>
            )}
          </button>
          
          {!user ? (
            <Link to="/auth" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:scale-105 transition-all shadow-xl shadow-primary/20">
              Log In
            </Link>
          ) : (
            <Link to="/dashboard" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center gap-2">
              Dashboard <ArrowRight className="w-4 h-4 hidden sm:block" />
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
        <div className="space-y-8">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${
             isActive ? 'bg-success/10 border-success/20' : 'bg-primary/5 border-primary/10'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${isActive ? 'bg-success' : 'bg-primary'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-success' : 'text-primary'}`}>
              {isActive ? 'WASM Engine Running' : 'Client-Side Engine Ready'}
            </span>
          </div>
          
          {error && (
            <div className="bg-error/10 border border-error/20 text-error p-4 rounded-2xl text-sm font-semibold flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-error animate-ping" />
              <p>{error}</p>
            </div>
          )}
          <h1 className="text-6xl lg:text-8xl font-black text-primary leading-[0.9] tracking-tighter">
            Your Hands <br />
            <span className="text-text-secondary/20">Are the Controller.</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-lg leading-relaxed">
            The world's most advanced AI gesture interface. Connect your camera and control the entire web app with zero-latency neural tracking directly in your browser.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={isActive ? stopCamera : startCamera}
              className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                isActive
                  ? 'bg-success text-white hover:bg-success/90 shadow-xl shadow-success/30'
                  : 'bg-primary text-white hover:scale-105 shadow-2xl shadow-primary/30'
              }`}
            >
              {isActive ? (
                <>Tracking Active <CameraOff className="w-5 h-5" /></>
              ) : (
                <>Start Tracking Now <Camera className="w-5 h-5" /></>
              )}
            </button>
            <Link to={user ? "/dashboard" : "/auth"} className="px-8 py-4 rounded-2xl font-bold text-lg border border-accent hover:bg-white transition-all text-center">
              Go to Dashboard
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full" />
          <div className="relative bg-white p-4 rounded-[40px] shadow-2xl border border-accent overflow-hidden">
             <img 
               src="/logo.png" 
               alt="VisionTouch Logo" 
               className="rounded-[32px] w-full aspect-[4/3] object-contain p-12 bg-primary/5"
             />
             <div className="absolute bottom-10 left-10 right-10 bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-primary rounded-2xl text-white">
                      <Zap className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-xs font-bold text-text-secondary uppercase">Processing Speed</p>
                      <p className="text-2xl font-black text-primary">8.4ms Latency</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-32">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: Shield, title: 'Enterprise Security', desc: 'Bank-grade encryption and secure Google OAuth integration.' },
            { icon: Globe, title: 'Cross Platform', desc: 'Seamlessly works on Windows, MacOS, and mobile PWA.' },
            { icon: Zap, title: 'Real-time Sync', desc: 'Sync gesture datasets across all your devices instantly.' },
          ].map((f, i) => (
            <div key={i} className="space-y-4 p-8 rounded-3xl border border-accent hover:border-primary/20 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <f.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-primary">{f.title}</h3>
              <p className="text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
