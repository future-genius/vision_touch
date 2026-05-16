import { useAuth } from '../context/AuthContext';
import { Hand, ArrowRight } from 'lucide-react';

export function Login() {
  const { signInWithGoogle, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-accent overflow-hidden">
        <div className="bg-primary p-8 text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Hand className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">VisionTouch</h1>
          <p className="text-white/70 text-sm mt-2">Enterprise AI Gesture Interface</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-text-primary">Welcome Back</h2>
            <p className="text-text-secondary text-sm">Sign in to access your dashboard and AI controls.</p>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-accent px-4 py-3 rounded-xl font-semibold text-text-primary hover:bg-background transition-all shadow-sm group"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all translate-x--2 group-hover:translate-x-0" />
          </button>

          <div className="pt-6 border-t border-accent text-center">
            <p className="text-xs text-text-secondary">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
