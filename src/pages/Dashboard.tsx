import { Activity, Camera, Hand, Users } from 'lucide-react';
import { RealTimeAnalytics } from '../components/dashboard/RealTimeAnalytics';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tighter">System Overview</h1>
        <p className="text-text-secondary">Global performance and operational status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Engine', value: 'Neural v4.2', icon: Activity, color: 'text-success' },
          { label: 'Camera Status', value: 'Ready', icon: Camera, color: 'text-primary' },
          { label: 'Gestures Loaded', value: '18 Active', icon: Hand, color: 'text-amber-500' },
          { label: 'Cloud Sync', value: 'Encrypted', icon: Users, color: 'text-blue-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-accent flex items-center gap-4 group hover:border-primary/20 transition-all">
            <div className={`p-3 rounded-2xl bg-background ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{stat.label}</p>
              <p className="text-lg font-black text-primary">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <RealTimeAnalytics />
    </div>
  );
}
