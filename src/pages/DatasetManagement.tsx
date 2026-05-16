import { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Edit3, Play, RefreshCw, Layers, Check, X, StopCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAiStream } from '../hooks/useAiStream';
import { cn } from '../lib/utils';

interface Dataset {
  id: string;
  name: string;
  samples_count: number;
  status: string;
  version: string;
}

export function DatasetManagement() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const { data: aiData } = useAiStream();
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [isFeeding, setIsFeeding] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Real-time Feeding Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isFeeding && activeDatasetId && aiData.trackingStatus === 'Active') {
      interval = setInterval(async () => {
        // Record current landmarks to Supabase
        await supabase.from('dataset_samples').insert([{
          dataset_id: activeDatasetId,
          gesture_label: aiData.gesture,
          landmark_data: aiData
        }]);

        // Increment local count for visual feedback
        setDatasets(prev => prev.map(d => 
          d.id === activeDatasetId 
            ? { ...d, samples_count: d.samples_count + 1 } 
            : d
        ));
      }, 500); // Capture every 500ms
    }
    return () => clearInterval(interval);
  }, [isFeeding, activeDatasetId, aiData]);

  async function fetchDatasets() {
    const { data } = await supabase
      .from('datasets')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setDatasets(data);
  }

  const addDataset = async () => {
    if (!newName) return;
    const { error } = await supabase
      .from('datasets')
      .insert([{ name: newName, samples_count: 0, status: 'Active', version: 'v1.0.0' }]);
    
    if (!error) {
      setNewName('');
      setIsAdding(false);
      fetchDatasets();
    }
  };

  const removeDataset = async (id: string) => {
    const { error } = await supabase.from('datasets').delete().eq('id', id);
    if (!error) fetchDatasets();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase">Dataset Control Center</h1>
          <p className="text-text-secondary">Enterprise-grade data feeding and model management</p>
        </div>
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> Create New Set
          </button>
        ) : (
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Dataset Name..."
              className="bg-white border border-primary/20 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-primary w-64"
            />
            <button onClick={addDataset} className="p-3 bg-success text-white rounded-xl hover:bg-success/90 transition-all"><Check className="w-5 h-5" /></button>
            <button onClick={() => setIsAdding(false)} className="p-3 bg-error text-white rounded-xl hover:bg-error/90 transition-all"><X className="w-5 h-5" /></button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {datasets.length === 0 && (
            <div className="bg-white p-20 rounded-[40px] border border-dashed border-accent flex flex-col items-center text-center">
               <Database className="w-12 h-12 text-accent mb-4" />
               <p className="text-text-secondary font-bold">No datasets found. Create your first one to start training.</p>
            </div>
          )}

          {datasets.map((dataset) => (
            <div 
              key={dataset.id} 
              onClick={() => !isFeeding && setActiveDatasetId(dataset.id)}
              className={cn(
                "bg-white p-8 rounded-[32px] shadow-sm border flex items-center justify-between group transition-all cursor-pointer",
                activeDatasetId === dataset.id ? "border-primary ring-2 ring-primary/10 shadow-lg" : "border-accent hover:border-primary/30"
              )}
            >
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center transition-all",
                  activeDatasetId === dataset.id ? "bg-primary text-white" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white"
                )}>
                  <Database className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-primary tracking-tighter">{dataset.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                    <span className="flex items-center gap-2 text-primary">
                      <Layers className="w-4 h-4" /> 
                      <span className={cn(isFeeding && activeDatasetId === dataset.id && "animate-pulse text-success")}>
                        {dataset.samples_count} samples
                      </span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>Version {dataset.version}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {isFeeding && activeDatasetId === dataset.id && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-success/10 text-success rounded-full text-[10px] font-black uppercase tracking-widest animate-bounce">
                    Feeding...
                  </div>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeDataset(dataset.id); }}
                    className="p-3 bg-background text-text-secondary hover:text-error hover:bg-error/5 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-[#0F172A] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
            <h3 className="text-lg font-black mb-4 flex items-center gap-2 uppercase tracking-tighter relative z-10">
              <RefreshCw className={cn("w-5 h-5", isFeeding && "animate-spin")} />
              AI Neural Feed
            </h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed relative z-10">
              {activeDatasetId 
                ? "Neural tracking ready. Click start to feed landmarks to the cloud." 
                : "Select a dataset from the list to begin the neural feeding cycle."}
            </p>
            
            <button 
              disabled={!activeDatasetId}
              onClick={() => setIsFeeding(!isFeeding)}
              className={cn(
                "w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl relative z-10",
                !activeDatasetId ? "bg-slate-800 text-slate-500 cursor-not-allowed" :
                isFeeding ? "bg-error text-white hover:bg-error/90" : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
              )}
            >
              {isFeeding ? <StopCircle className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isFeeding ? "Stop Feeding Cycle" : "Start Feeding Cycle"}
            </button>

            {isFeeding && (
              <div className="mt-6 pt-6 border-t border-white/5 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Engine Status</span>
                    <span className="text-success">{aiData.trackingStatus}</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Gesture Label</span>
                    <span className="text-primary">{aiData.gesture}</span>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
