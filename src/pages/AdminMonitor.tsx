import { Users, Activity, Clock, ShieldCheck, Terminal } from 'lucide-react';
import { cn } from '../lib/utils';

export function AdminMonitor() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end pb-4 border-b border-accent">
        <div>
          <h1 className="text-2xl font-bold text-primary">Admin Control Center</h1>
          <p className="text-sm text-text-secondary mt-1">Real-time system monitoring and user activity</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold bg-success/10 text-success px-3 py-1.5 rounded-full border border-success/20">
          <ShieldCheck className="w-4 h-4" /> Secure Admin Session
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Users, label: 'Active Users', value: '12', trend: '+2 online' },
          { icon: Activity, label: 'Inference Load', value: '42%', trend: 'Stable' },
          { icon: Clock, label: 'Avg. Session', value: '24m', trend: '↑ 12%' },
          { icon: ShieldCheck, label: 'API Health', value: '99.9%', trend: 'Operational' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-accent">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary/5 rounded-lg">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-success">{stat.trend}</span>
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
            <h2 className="text-lg font-semibold text-text-primary">User Interaction Control</h2>
            <button className="text-xs font-bold text-primary hover:underline">Export Logs</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-accent text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  <th className="pb-3 px-2">User Identity</th>
                  <th className="pb-3 px-2">Current Role</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent/50">
                {[
                  { email: 'haranhari28@gmail.com', role: 'User', status: 'Online', color: 'bg-success' },
                  { email: 'alex.research@vision.io', role: 'User', status: 'Idle', color: 'bg-amber-400' },
                  { email: 'projectvisiontouch@gmail.com', role: 'Admin', status: 'Online', color: 'bg-success' },
                ].map((u, i) => (
                  <tr key={i} className="text-sm group hover:bg-background/50 transition-colors">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">{u.email[0].toUpperCase()}</div>
                        <span className="font-medium text-text-primary">{u.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                       <span className={cn(
                         "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter",
                         u.role === 'Admin' ? "bg-primary text-white" : "bg-accent text-text-secondary"
                       )}>{u.role}</span>
                    </td>
                    <td className="py-4 px-2">
                       <div className="flex items-center gap-2">
                         <div className={cn("w-2 h-2 rounded-full", u.color)} />
                         <span className="text-xs font-medium text-text-secondary">{u.status}</span>
                       </div>
                    </td>
                    <td className="py-4 px-2 text-right space-x-2">
                       <button className="text-[10px] font-bold text-primary hover:text-primary/70 uppercase">Promote</button>
                       <button className="text-[10px] font-bold text-error hover:text-error/70 uppercase">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Event Stream */}
        <div className="bg-text-primary p-6 rounded-2xl shadow-sm border border-text-primary text-white flex flex-col">
          <h2 className="text-lg font-semibold text-white/90 flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-accent" />
            Global Event Stream
          </h2>
          <div className="flex-1 bg-black/20 rounded-xl p-4 font-mono text-xs overflow-y-auto space-y-2 border border-white/5">
            <p className="text-success"><span className="opacity-50">[21:12:45]</span> ADMIN_LOGIN: user_8291 authorized</p>
            <p className="text-white/70"><span className="opacity-50">[21:12:50]</span> DATASET_RETRAIN_TRIGGERED: ResNet50_v2</p>
            <p className="text-amber-400"><span className="opacity-50">[21:13:02]</span> WEBSOCKET_LATENCY_SPIKE: 145ms</p>
            <p className="text-white/70"><span className="opacity-50">[21:13:15]</span> SESSION_CLOSED: user_4120</p>
            <p className="text-success"><span className="opacity-50">[21:14:01]</span> CAMERA_INIT_SUCCESS: node_hq_01</p>
          </div>
        </div>
      </div>
    </div>
  );
}
