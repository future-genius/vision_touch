import { LiveCameraFeed } from '../components/dashboard/LiveCameraFeed';
import { GestureDetectionPanel } from '../components/dashboard/GestureDetectionPanel';

export function CameraView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tighter">Live Vision Stream</h1>
        <p className="text-text-secondary">Direct high-speed feed with neural landmark visualization</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveCameraFeed />
        </div>
        <div>
          <GestureDetectionPanel />
        </div>
      </div>
    </div>
  );
}
