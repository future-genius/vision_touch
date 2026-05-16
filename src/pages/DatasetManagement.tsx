import { Database, Plus, Trash2, Edit3, Play, RefreshCw, Layers } from 'lucide-react';

const mockDatasets = [
  { id: 1, name: 'Standard Office Gestures', samples: 1250, status: 'Active', version: 'v2.1' },
  { id: 2, name: 'Precision Engineering Set', samples: 840, status: 'Training', version: 'v1.4-beta' },
  { id: 3, name: 'Medical Navigation Controls', samples: 2100, status: 'Active', version: 'v3.0' },
];

export function DatasetManagement() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end pb-4 border-b border-accent">
        <div>
          <h1 className="text-2xl font-bold text-primary">Dataset Management</h1>
          <p className="text-sm text-text-secondary mt-1">Manage AI training data, labels, and gesture mappings</p>
        </div>
        <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Create New Dataset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datasets List */}
        <div className="lg:col-span-2 space-y-4">
          {mockDatasets.map((dataset) => (
            <div key={dataset.id} className="bg-white p-6 rounded-2xl shadow-sm border border-accent flex items-center justify-between group hover:border-primary/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">{dataset.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {dataset.samples} samples</span>
                    <span className="w-1 h-1 rounded-full bg-accent" />
                    <span>Version {dataset.version}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                  dataset.status === 'Active' ? 'bg-success/5 text-success border-success/20' : 'bg-amber-500/5 text-amber-600 border-amber-500/20'
                }`}>
                  {dataset.status}
                </span>
                <button className="p-2 text-text-secondary hover:text-primary transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button className="p-2 text-text-secondary hover:text-error transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Retraining Controls */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-accent space-y-6">
          <h2 className="text-lg font-semibold text-text-primary">Inference Engine</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-background rounded-xl border border-accent/50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-text-secondary uppercase">Current Model</span>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">VisionResNet_v4</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-text-secondary">Validation Accuracy</span>
                  <span className="text-text-primary font-bold">98.4%</span>
                </div>
                <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                  <div className="h-full bg-success w-[98.4%]" />
                </div>
              </div>
            </div>

            <button className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <RefreshCw className="w-4 h-4" /> Retrain Global Engine
            </button>
            
            <button className="w-full bg-background border border-accent text-text-primary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-accent transition-all">
              <Play className="w-4 h-4 text-success" /> Live Testing Mode
            </button>
          </div>

          <div className="pt-4 border-t border-accent">
            <p className="text-xs text-text-secondary leading-relaxed">
              Updating the dataset will automatically trigger a partial retraining of the top layer of the neural network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
