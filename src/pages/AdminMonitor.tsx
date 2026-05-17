import { Users, Activity, Clock, ShieldCheck, Terminal, RefreshCw } from 'lucide-react';
import { useAiStream } from '../hooks/useAiStream';
import { cn } from '../lib/utils';

export function AdminMonitor() {
  const { 
    data, 
    logs, 
    isConnected, 
    triggerHotReload 
  } = useAiStream();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end pb-4 border-b border-accent">
        <div>
          <h1 className="text-2xl font-bold text-primary">System Monitoring Console</h1>
          <p className="text-sm text-text-secondary mt-1">Real-time AI telemetry, websocket server health, and interface logs</p>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && (
            <button 
              onClick={triggerHotReload}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Reload Engine Mappings
            </button>
          )}
          <div className={cn(
            "flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl border",
            isConnected 
              ? "bg-success/10 text-success border-success/20" 
              : "bg-error/10 text-error border-error/20"
          )}>
            <ShieldCheck className="w-4 h-4" /> {isConnected ? 'SECURE NODE ACTIVE' : 'NODE OFFLINE'}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            icon: Users, 
            label: 'Telemetry Node', 
            value: isConnected ? 'Localhost' : 'Offline', 
            trend: isConnected ? 'Online' : 'Disconnected',
            trendColor: isConnected ? 'text-success' : 'text-error'
          },
          { 
            icon: Activity, 
            label: 'Inference Load', 
            value: `${data.inferenceTimeMs.toFixed(1)} ms`, 
            trend: data.inferenceTimeMs < 15 ? 'Excellent' : 'Lagging',
            trendColor: data.inferenceTimeMs < 15 ? 'text-success' : 'text-amber-500'
          },
          { 
            icon: Clock, 
            label: 'Frame Rate', 
            value: `${data.fps} FPS`, 
            trend: data.fps > 24 ? 'Fluid' : 'Throttled',
            trendColor: data.fps > 24 ? 'text-success' : 'text-amber-500'
          },
          { 
            icon: ShieldCheck, 
            label: 'Websocket Status', 
            value: isConnected ? 'Stable' : 'Offline', 
            trend: isConnected ? 'Active' : 'Reconnecting...',
            trendColor: isConnected ? 'text-success' : 'text-error animate-pulse'
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-accent">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary/5 rounded-lg">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <span className={cn("text-xs font-bold", stat.trendColor)}>{stat.trend}</span>
            </div>
            <p className="text-sm font-medium text-text-secondary">{stat.label}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Management Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-accent overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-text-primary">System Client Connections</h2>
            <button className="text-xs font-bold text-primary hover:underline">Export Session Logs</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-accent text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  <th className="pb-3 px-2">Connected Node</th>
                  <th className="pb-3 px-2">Role</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent/50">
                <tr className="text-sm group hover:bg-background/50 transition-colors">
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">A</div>
                      <span className="font-medium text-text-primary">admin.visiontouch@workspace.io</span>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                     <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter bg-primary text-white">Admin</span>
                  </td>
                  <td className="py-4 px-2">
                     <div className="flex items-center gap-2">
                       <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-success animate-pulse" : "bg-error")} />
                       <span className="text-xs font-medium text-text-secondary">{isConnected ? 'Online' : 'Offline'}</span>
                     </div>
                  </td>
                  <td className="py-4 px-2 text-right text-xs font-semibold text-slate-500">
                     Active Web Console
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time System Log Stream */}
        <div className="bg-slate-950 p-6 rounded-2xl shadow-lg text-white flex flex-col h-[400px]">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-primary" />
            Global Interface Stream
          </h2>
          <div className="flex-1 bg-black/40 rounded-xl p-4 font-mono text-[11px] overflow-y-auto space-y-2.5 border border-white/5 scrollbar-thin scrollbar-thumb-slate-800">
            {logs.length === 0 ? (
              <p className="text-slate-500 text-center py-10 italic">Awaiting telemetry logs...</p>
            ) : (
              logs.map((log, i) => (
                <p 
                  key={i} 
                  className={cn(
                    "leading-relaxed",
                    log.type === 'success' ? "text-success" :
                    log.type === 'warning' ? "text-amber-400" :
                    log.type === 'error' ? "text-red-400" : "text-slate-300"
                  )}
                >
                  <span className="opacity-45 mr-1.5">[{log.timestamp}]</span>
                  {log.message}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
