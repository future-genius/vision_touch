import { Save, Sliders, Camera } from 'lucide-react';

export function Settings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-end pb-4 border-b border-accent">
        <div>
          <h1 className="text-2xl font-bold text-primary">System Settings</h1>
          <p className="text-sm text-text-secondary mt-1">Configure AI model parameters and camera settings</p>
        </div>
        <button className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camera Config */}
        <div className="bg-white rounded-xl shadow-sm border border-accent p-6 space-y-6">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Input Configuration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Video Source</label>
              <select className="w-full border border-accent rounded-md px-3 py-2 text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option>Integrated Webcam (0x01)</option>
                <option>External USB Camera (0x02)</option>
                <option>Mobile Sync Stream</option>
              </select>
            </div>
            
            <div>
               <label className="block text-sm font-medium text-text-secondary mb-1">Target Framerate</label>
               <select className="w-full border border-accent rounded-md px-3 py-2 text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option>30 FPS (Recommended)</option>
                  <option>60 FPS (High Performance)</option>
                  <option>15 FPS (Battery Saver)</option>
               </select>
            </div>
          </div>
        </div>

        {/* AI Config */}
        <div className="bg-white rounded-xl shadow-sm border border-accent p-6 space-y-6">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            AI Model Parameters
          </h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-text-secondary">Detection Confidence Threshold</label>
                <span className="text-xs font-bold text-primary">75%</span>
              </div>
              <input type="range" min="0" max="100" defaultValue="75" className="w-full accent-primary" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-text-secondary">Tracking Precision</label>
                <span className="text-xs font-bold text-primary">High</span>
              </div>
              <input type="range" min="0" max="100" defaultValue="80" className="w-full accent-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
