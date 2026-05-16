import { RealTimeAnalytics } from '../components/dashboard/RealTimeAnalytics';
import { SystemLogPanel } from '../components/dashboard/SystemLogPanel';
import { TrendingUp, Cpu } from 'lucide-react';

export function AnalyticsView() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter">Engine Analytics</h1>
          <p className="text-text-secondary">High-frequency performance and inference telemetry</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-white px-4 py-2 rounded-xl border border-accent flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs font-bold text-primary">Efficiency: 94.2%</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <RealTimeAnalytics />
        <div className="bg-white p-8 rounded-3xl border border-accent">
           <div className="flex items-center gap-3 mb-8">
              <Cpu className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-primary">Inference Engine Logs</h2>
           </div>
           <SystemLogPanel />
        </div>
      </div>
    </div>
  );
}
