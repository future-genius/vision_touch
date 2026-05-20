import { Cpu, Database, Activity, RefreshCw } from 'lucide-react';
import { useAiStream } from '../../hooks/useAiStream';

export function SystemTelemetry() {
  const { data, isConnected } = useAiStream();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {/* CPU Diagnostics Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-[0_0_20px_rgba(30,58,95,0.15)] flex flex-col justify-between h-44 hover:border-primary/50 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none"></div>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-900/40 text-blue-400 rounded-2xl border border-blue-800/40">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Processor Load</p>
              <h4 className="text-sm font-bold text-slate-300 mt-0.5">CPU Core Load</h4>
            </div>
          </div>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-black">
            NATIVE
          </span>
        </div>
        
        <div className="flex items-end justify-between mt-4">
          <div>
            <span className="text-3xl font-extrabold text-white tracking-tighter">
              {isConnected ? data.cpuLoad.toFixed(1) : '0.0'}
            </span>
            <span className="text-sm text-slate-500 font-bold ml-1">%</span>
          </div>
          
          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${isConnected ? data.cpuLoad : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Memory Diagnostics Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-[0_0_20px_rgba(30,58,95,0.15)] flex flex-col justify-between h-44 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent pointer-events-none"></div>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-950/40 text-emerald-400 rounded-2xl border border-emerald-900/40">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Memory Pool</p>
              <h4 className="text-sm font-bold text-slate-300 mt-0.5">RAM Utilization</h4>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black">
            HOST
          </span>
        </div>

        <div className="flex items-end justify-between mt-4">
          <div>
            <span className="text-3xl font-extrabold text-white tracking-tighter">
              {isConnected ? data.ramLoad.toFixed(1) : '0.0'}
            </span>
            <span className="text-sm text-slate-500 font-bold ml-1">%</span>
          </div>

          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${isConnected ? data.ramLoad : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Active Threads & Execution Engine */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-[0_0_20px_rgba(30,58,95,0.15)] flex flex-col justify-between h-44 hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-transparent pointer-events-none"></div>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-950/40 text-purple-400 rounded-2xl border border-purple-900/40">
              <Activity className="w-5 h-5 animate-[spin_6s_linear_infinite]" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Thread Pool</p>
              <h4 className="text-sm font-bold text-slate-300 mt-0.5">Model Latency</h4>
            </div>
          </div>
          <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-black">
            ENGINE
          </span>
        </div>

        <div className="flex items-end justify-between mt-4">
          <div>
            <span className="text-3xl font-extrabold text-white tracking-tighter">
              {isConnected ? data.inferenceTimeMs.toFixed(1) : '0.0'}
            </span>
            <span className="text-sm text-slate-500 font-bold ml-1">ms</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold bg-purple-500/5 border border-purple-500/10 px-2.5 py-1 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>T-Lite CPU</span>
          </div>
        </div>
      </div>
    </div>
  );
}
