import { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Edit3, Play, RefreshCw, Layers, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Dataset {
  id: string;
  name: string;
  samples_count: number;
  status: string;
  version: string;
}

export function DatasetManagement() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  useEffect(() => {
    fetchDatasets();
  }, []);

  async function fetchDatasets() {
    const { data } = await supabase
      .from('datasets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setDatasets(data);
  }

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

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
            <div key={dataset.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-accent flex items-center justify-between group hover:border-primary/30 transition-all">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <Database className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-primary tracking-tighter">{dataset.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                    <span className="flex items-center gap-2 text-primary"><Layers className="w-4 h-4" /> {dataset.samples_count} samples</span>
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
                  <button 
                    onClick={() => removeDataset(dataset.id)}
                    className="p-3 bg-background text-text-secondary hover:text-error hover:bg-error/5 rounded-xl transition-all active:scale-90"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-accent">
            <h3 className="text-lg font-black text-primary mb-4 flex items-center gap-2 uppercase tracking-tighter">
              <RefreshCw className="w-5 h-5" />
              Feed AI Engine
            </h3>
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">
              Inject new labeled samples into the active inference model.
            </p>
            <div className="space-y-4">
              <button className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20">
                 <Play className="w-4 h-4" /> Start Feeding Cycle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
