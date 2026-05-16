import { Smartphone, Wifi, QrCode, Link as LinkIcon } from 'lucide-react';

export function MobileSync() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-end pb-4 border-b border-accent">
        <div>
          <h1 className="text-2xl font-bold text-primary">Mobile Synchronization</h1>
          <p className="text-sm text-text-secondary mt-1">Connect your mobile device as a remote camera or control pad</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Status */}
        <div className="bg-white rounded-xl shadow-sm border border-accent p-6 space-y-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Device Status
            </h2>
            <p className="text-sm text-text-secondary">No active mobile devices connected. Pair a device to stream camera feed directly to the VisionTouch processing engine.</p>
          </div>
          
          <div className="p-4 bg-background border border-accent/50 rounded-lg flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                   <Wifi className="w-5 h-5 text-text-secondary" />
                </div>
                <div>
                   <p className="text-sm font-bold text-text-primary">Local Network</p>
                   <p className="text-xs text-text-secondary">192.168.1.105:8080</p>
                </div>
             </div>
             <span className="text-xs font-semibold bg-success/10 text-success px-2 py-1 rounded">Ready to pair</span>
          </div>
        </div>

        {/* Pairing Instructions */}
        <div className="bg-white rounded-xl shadow-sm border border-accent p-6 flex flex-col items-center justify-center text-center space-y-4">
           <div className="w-32 h-32 bg-background border border-accent rounded-lg flex items-center justify-center mb-2 shadow-inner">
             <QrCode className="w-16 h-16 text-text-primary opacity-50" />
           </div>
           <div>
             <h3 className="font-bold text-text-primary">Scan to Connect</h3>
             <p className="text-xs text-text-secondary max-w-[250px] mt-1 mx-auto">
               Open the VisionTouch Mobile App and scan this QR code to establish a secure WebSocket connection.
             </p>
           </div>
           <button className="mt-4 px-4 py-2 border border-accent text-text-primary font-medium text-sm rounded hover:bg-background transition-colors flex items-center gap-2">
             <LinkIcon className="w-4 h-4" />
             Manual IP Entry
           </button>
        </div>
      </div>
    </div>
  );
}
