import { RealTimeAnalytics } from '../components/dashboard/RealTimeAnalytics';
import { SystemTelemetry } from '../components/dashboard/SystemTelemetry';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tighter">System Overview</h1>
        <p className="text-text-secondary">Global performance and operational status</p>
      </div>

      <SystemTelemetry />

      <RealTimeAnalytics />
    </div>
  );
}
