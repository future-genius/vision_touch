import { Database, Plus, Trash2, Edit3, Play, RefreshCw, Layers, Camera } from 'lucide-react';

const mockDatasets = [
  { id: 1, name: 'Standard Office Gestures', samples: 1250, status: 'Active', version: 'v2.1' },
  { id: 2, name: 'Surgical Precision Set', samples: 4800, status: 'Training', version: 'v3.0' },
  { id: 3, name: 'Mobile Interaction Batch', samples: 920, status: 'Active', version: 'v1.4' },
];

export function DatasetManagement() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter">Dataset Control Center</h1>
          <p className="text-text-secondary">Enterprise-grade data feeding and model management</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:shadow-xl hover:shadow-primary/20 transition-all">
          <Plus className="w-5 h-5" /> Create New Set
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datasets List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-primary/5 p-8 rounded-[32px] border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary rounded-2xl text-white animate-pulse shadow-lg shadow-primary/20">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-primary tracking-tighter">Neural Capture Mode</h3>
                <p className="text-sm text-text-secondary">Capture real-time hand gestures to feed the AI engine</p>
              </div>
            </div>
            <div className="flex gap-3">
               <button className="px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20">Record Batch</button>
               <button className="px-6 py-3 bg-white border border-accent text-xs font-black uppercase tracking-widest rounded-xl hover:bg-background transition-all">Live Feed</button>
            </div>
          </div>

          {mockDatasets.map((dataset) => (
            <div key={dataset.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-accent flex items-center justify-between group hover:border-primary/30 transition-all">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <Database className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-primary tracking-tighter">{dataset.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                    <span className="flex items-center gap-2 text-primary"><Layers className="w-4 h-4" /> {dataset.samples} samples</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>Version {dataset.version}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${
                  dataset.status === 'Active' ? 'bg-success/5 text-success border-success/20' : 'bg-amber-500/5 text-amber-600 border-amber-500/20'
                }`}>
                  {dataset.status}
                </span>
                <div className="flex gap-2">
                  <button className="p-3 bg-background text-text-secondary hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button className="p-3 bg-background text-text-secondary hover:text-error hover:bg-error/5 rounded-xl transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dataset Controls */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-accent">
            <h3 className="text-lg font-black text-primary mb-4 flex items-center gap-2 uppercase tracking-tighter">
              <RefreshCw className="w-5 h-5" />
              Feed AI Engine
            </h3>
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">
              Inject new labeled samples into the active inference model to improve recognition accuracy.
            </p>
            <div className="space-y-4">
              <button className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20">
                 <Play className="w-4 h-4" /> Start Feeding Cycle
              </button>
              <button className="w-full py-4 bg-white border border-primary/20 text-primary rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/5 transition-all">
                 Validate Data Integrity
              </button>
            </div>
          </div>

          <div className="bg-primary p-10 rounded-[40px] text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10">
              <h3 className="text-2xl font-black tracking-tighter mb-2">Engine Training</h3>
              <p className="text-xs text-white/70 mb-8 uppercase tracking-widest font-bold">In-Progress Optimization</p>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase">Batch Progress</span>
                  <span className="text-2xl font-black tracking-tighter">75.4%</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
