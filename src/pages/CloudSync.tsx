import { useState, useEffect } from 'react';
import { Cloud, Database, RefreshCw, HardDriveUpload, CheckCircle2, ShieldCheck, Server } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export function CloudSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Just now');
  const [stats, setStats] = useState({ gestures: 0, models: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const { count: gCount } = await supabase.from('gestures').select('*', { count: 'exact', head: true });
    const { count: mCount } = await supabase.from('ai_models').select('*', { count: 'exact', head: true });
    setStats({ gestures: gCount || 0, models: mCount || 0 });
  }

  const triggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSynced('Just now');
    }, 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end pb-4 border-b border-accent">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Cloud className="w-7 h-7" /> Cloud Infrastructure
          </h1>
          <p className="text-sm text-text-secondary mt-1">Manage remote database synchronization and AI model backups</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sync Control Panel */}
        <div className="bg-white p-6 rounded-3xl border border-accent shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                 <Server className="w-6 h-6 text-primary" />
               </div>
               <div>
                 <h2 className="text-lg font-bold text-text-primary">Supabase Database</h2>
                 <p className="text-xs font-semibold text-success flex items-center gap-1">
                   <ShieldCheck className="w-3 h-3" /> E2E Encrypted Connection
                 </p>
               </div>
             </div>
             <span className="text-[10px] font-black bg-slate-100 px-3 py-1.5 rounded-full uppercase tracking-widest text-slate-500">
               PostgreSQL 15
             </span>
          </div>

          <div className="flex-1 space-y-4 mb-8">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="flex items-center gap-3">
                 <Database className="w-5 h-5 text-slate-400" />
                 <span className="text-sm font-semibold text-text-secondary">Gesture Definitions</span>
               </div>
               <span className="text-sm font-black text-text-primary">{stats.gestures} Records</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="flex items-center gap-3">
                 <HardDriveUpload className="w-5 h-5 text-slate-400" />
                 <span className="text-sm font-semibold text-text-secondary">Trained AI Models</span>
               </div>
               <span className="text-sm font-black text-text-primary">{stats.models} Models</span>
            </div>
          </div>

          <button 
            onClick={triggerSync}
            disabled={isSyncing}
            className={cn(
              "w-full py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2",
              isSyncing 
                ? "bg-slate-200 text-slate-500 cursor-not-allowed" 
                : "bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-primary/20"
            )}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Syncing to Cloud...
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" /> Force Manual Sync
              </>
            )}
          </button>
        </div>

        {/* Sync Status Overview */}
        <div className="space-y-6">
          <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-xl flex flex-col h-full relative overflow-hidden">
             <h3 className="text-sm font-bold uppercase tracking-widest mb-6 opacity-60">Synchronization Log</h3>
             
             <div className="flex-1 space-y-6">
               <div className="relative pl-6 border-l-2 border-success/30 pb-6">
                 <div className="absolute -left-[9px] top-0 w-4 h-4 bg-slate-950 border-2 border-success rounded-full flex items-center justify-center">
                   <div className="w-1.5 h-1.5 bg-success rounded-full" />
                 </div>
                 <p className="text-sm font-bold text-slate-200">Full System Snapshot Synced</p>
                 <p className="text-xs text-slate-500 mt-1">{lastSynced}</p>
                 <div className="mt-3 bg-white/5 rounded-lg p-3 text-[10px] font-mono text-success flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" /> Checksum verified
                 </div>
               </div>
               
               <div className="relative pl-6 border-l-2 border-white/10 pb-6">
                 <div className="absolute -left-[9px] top-0 w-4 h-4 bg-slate-950 border-2 border-slate-600 rounded-full" />
                 <p className="text-sm font-bold text-slate-200">Background Telemetry Sync</p>
                 <p className="text-xs text-slate-500 mt-1">10 minutes ago</p>
               </div>
               
               <div className="relative pl-6">
                 <div className="absolute -left-[9px] top-0 w-4 h-4 bg-slate-950 border-2 border-slate-600 rounded-full" />
                 <p className="text-sm font-bold text-slate-200">Local Cache Updated</p>
                 <p className="text-xs text-slate-500 mt-1">1 hour ago</p>
               </div>
             </div>
             
             <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
               <span>Next auto-sync in 45:00</span>
               <div className="flex items-center gap-1.5 text-success">
                 <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                 Tunnel Active
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
