import { RealTimeAnalytics } from '../components/dashboard/RealTimeAnalytics';
import { SystemTelemetry } from '../components/dashboard/SystemTelemetry';
import { useAuth } from '../context/AuthContext';
import { useAiStream } from '../hooks/useAiStream';
import { Link } from 'react-router-dom';
import { Volume2, ShieldAlert, LogIn, Megaphone } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const { speakStatus, speakDashboard, isConnected } = useAiStream();

  return (
    <div className="space-y-6">
      {/* Title Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter">System Overview</h1>
          <p className="text-text-secondary">Global performance and operational status</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={speakStatus}
            disabled={!isConnected}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-accent hover:bg-slate-50 disabled:opacity-50 text-text-primary rounded-xl text-xs font-bold transition-all shadow-sm group active:scale-95"
            title="Announce Current Tracker Status"
          >
            <Volume2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            Speak Status
          </button>
          
          <button
            onClick={speakDashboard}
            disabled={!isConnected}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 group active:scale-95"
            title="Read Telemetry Metrics Aloud"
          >
            <Megaphone className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            Speak Diagnostics
          </button>
        </div>
      </div>

      {/* Guest Mode Callout Banner */}
      {!user && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none" />
          <div className="flex gap-4">
            <div className="p-3 bg-amber-500/15 text-amber-600 rounded-2xl border border-amber-500/20 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-800">Running in Guest Mode</h3>
              <p className="text-xs text-amber-700/80 mt-1 max-w-xl leading-relaxed">
                VisionTouch gestures and mouse control are fully functional locally. Sign in to back up your custom configurations, label training sets, and unlock the multi-device sync portal.
              </p>
            </div>
          </div>
          <Link
            to="/auth"
            className="flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-600/25 active:scale-95 shrink-0"
          >
            <LogIn className="w-4 h-4" />
            Sign In Now
          </Link>
        </div>
      )}

      <SystemTelemetry />

      <RealTimeAnalytics />
    </div>
  );
}
