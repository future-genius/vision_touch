import { LiveCameraFeed } from '../components/dashboard/LiveCameraFeed';
import { GestureDetectionPanel } from '../components/dashboard/GestureDetectionPanel';
import { RealTimeAnalytics } from '../components/dashboard/RealTimeAnalytics';
import { SystemLogPanel } from '../components/dashboard/SystemLogPanel';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end pb-4 border-b border-accent">
        <div>
          <h1 className="text-2xl font-bold text-primary">Overview</h1>
          <p className="text-sm text-text-secondary mt-1">Real-time AI gesture interaction metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Camera Feed - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2">
          <LiveCameraFeed />
        </div>
        
        {/* Gesture Details - Takes up 1 column */}
        <div>
          <GestureDetectionPanel />
        </div>

        {/* Analytics and Logs */}
        <div className="lg:col-span-2">
          <RealTimeAnalytics />
        </div>
        <div>
          <SystemLogPanel />
        </div>
      </div>
    </div>
  );
}
