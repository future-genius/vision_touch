import { useAuth } from '../context/AuthContext';
import { ArrowRight } from 'lucide-react';

export function Login() {
  const { signInWithGoogle, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl border border-accent overflow-hidden">
        <div className="bg-primary p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="w-20 h-20 rounded-[32px] bg-white flex items-center justify-center mx-auto mb-6 backdrop-blur-xl p-2 relative z-10 shadow-2xl border border-white/25">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase relative z-10">VisionTouch</h1>
          <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mt-3 relative z-10">Neural Interface v4.0</p>
        </div>
        
        <div className="p-10 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-primary tracking-tighter uppercase">Welcome Back</h2>
            <p className="text-text-secondary text-sm">Sign in to access your cloud-synced AI controls.</p>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-4 bg-white border border-accent px-6 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest text-primary hover:bg-background transition-all shadow-xl shadow-primary/5 group active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google
            <ArrowRight className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
          </button>

          <div className="pt-8 border-t border-accent text-center">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-40 leading-relaxed">
              Protected by Enterprise-Grade <br /> OAuth 2.0 Encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
