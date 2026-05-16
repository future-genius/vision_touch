import { Users, Activity, Clock, ShieldCheck, Terminal } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockSystemData = [
  { time: '12:00', load: 45, latency: 12 },
  { time: '13:00', load: 52, latency: 15 },
  { time: '14:00', load: 38, latency: 11 },
  { time: '15:00', load: 65, latency: 18 },
  { time: '16:00', load: 48, latency: 14 },
];

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
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-accent">
          <h2 className="text-lg font-semibold text-text-primary mb-6">System Performance History</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockSystemData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="time" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#F8FAFC'}}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="load" fill="#1E3A5F" radius={[4, 4, 0, 0]} name="CPU Load (%)" />
                <Bar dataKey="latency" fill="#16A34A" radius={[4, 4, 0, 0]} name="Latency (ms)" />
              </BarChart>
            </ResponsiveContainer>
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
