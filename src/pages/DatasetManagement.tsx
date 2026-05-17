import { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Play, RefreshCw, Layers, Check, X, StopCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAiStream } from '../hooks/useAiStream';
import { cn } from '../lib/utils';

interface Dataset {
  id: string;
  gesture_name: string;
  gesture_key: string;
  gesture_category: string;
  samples_count: number;
  enabled_status: boolean;
}

export function DatasetManagement() {
  const { 
    data: aiData, 
    startFeeding, 
    stopFeeding, 
    pendingPattern, 
    clearPendingPattern,
    triggerHotReload,
    retrainModel
  } = useAiStream();
  
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeGestureKey, setActiveGestureKey] = useState<string | null>(null);
  const [isFeeding, setIsFeeding] = useState(false);
  
  // New Gesture Manual Form States
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newCategory, setNewCategory] = useState('Navigation');

  // Pending Cluster Form States
  const [pendingName, setPendingName] = useState('');
  const [pendingKey, setPendingKey] = useState('');
  const [pendingCategory, setPendingCategory] = useState('Custom');
  const [pendingAction, setPendingAction] = useState('left_click');
  const [actionsList, setActionsList] = useState<any[]>([]);

  useEffect(() => {
    fetchDatasets();
    fetchActions();
  }, []);

  async function fetchActions() {
    const { data } = await supabase.from('actions').select('*');
    if (data) setActionsList(data);
  }

  async function fetchDatasets() {
    // Queries gesture registry and counts samples inside landmark_dataset
    const { data: gestures } = await supabase
      .from('gestures')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (gestures) {
      const formatted: Dataset[] = [];
      for (const g of gestures) {
        // Get count of samples
        const { count } = await supabase
          .from('landmark_dataset')
          .select('*', { count: 'exact', head: true })
          .eq('gesture_id', g.id);
          
        formatted.push({
          id: g.id,
          gesture_name: g.gesture_name,
          gesture_key: g.gesture_key,
          gesture_category: g.gesture_category || 'Custom',
          samples_count: count || 0,
          enabled_status: g.enabled_status
        });
      }
      setDatasets(formatted);
    }
  }

  // Handle active feeding mode state change
  const toggleFeeding = () => {
    if (!activeGestureKey) return;
    
    if (isFeeding) {
      stopFeeding();
      setIsFeeding(false);
      // Wait a moment then reload dataset counts
      setTimeout(fetchDatasets, 1000);
    } else {
      startFeeding(activeGestureKey);
      setIsFeeding(true);
    }
  };

  const createGesture = async () => {
    if (!newName || !newKey) return;
    
    const { data, error } = await supabase
      .from('gestures')
      .insert([{ 
        gesture_name: newName, 
        gesture_key: newKey, 
        gesture_category: newCategory,
        confidence_threshold: 0.70,
        enabled_status: true 
      }])
      .select();
      
    if (!error && data) {
      setNewName('');
      setNewKey('');
      setIsAdding(false);
      fetchDatasets();
      triggerHotReload();
    }
  };

  const deleteGesture = async (id: string) => {
    const { error } = await supabase.from('gestures').delete().eq('id', id);
    if (!error) {
      fetchDatasets();
      triggerHotReload();
    }
  };

  // Submit dynamic labeled gesture from auto-learning cluster modal
  const submitPendingGesture = async () => {
    if (!pendingName || !pendingKey || !pendingPattern) return;

    try {
      // 1. Insert into gestures table
      const { data: gData, error: gErr } = await supabase
        .from('gestures')
        .insert([{
          gesture_name: pendingName,
          gesture_key: pendingKey,
          gesture_icon: 'Sparkles',
          gesture_category: pendingCategory,
          confidence_threshold: 0.65
        }])
        .select();

      if (gErr || !gData) throw gErr;
      const newGesture = gData[0];

      // 2. Insert into gesture_action_map table
      // Find matching action id from action type
      const activeAct = actionsList.find(a => a.action_type === pendingAction) || actionsList[0];
      if (activeAct) {
        await supabase
          .from('gesture_action_map')
          .insert([{
            gesture_id: newGesture.id,
            action_id: activeAct.id,
            sensitivity: 1.0,
            cooldown: 0.4
          }]);
      }

      // 3. Insert cluster centroid vector into landmark_dataset
      await supabase
        .from('landmark_dataset')
        .insert([{
          gesture_id: newGesture.id,
          landmark_vectors: pendingPattern.landmark_vectors,
          sample_quality: pendingPattern.sample_quality
        }]);

      // Clear states & reload globally
      clearPendingPattern();
      setPendingName('');
      setPendingKey('');
      fetchDatasets();
      triggerHotReload();
    } catch (e) {
      console.error("Error creating dynamic pattern:", e);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* 1. AUTO-LEARNING MODAL PROMPT */}
      {pendingPattern && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] border border-primary/10 shadow-2xl p-6 md:p-8 max-w-lg w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full -mr-12 -mt-12 blur-2xl" />
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-success/10 text-success rounded-2xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-success uppercase tracking-widest">Neural Clusterer Alert</span>
                <h2 className="text-xl font-bold text-text-primary mt-0.5">Auto-Learned Gesture Pattern</h2>
              </div>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              The AI engine detected a stable hand pattern that does not match any current configurations. 
              Fill out the parameters below to label and map this gesture globally.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Gesture Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Three Finger Swipe"
                  value={pendingName}
                  onChange={(e) => {
                    setPendingName(e.target.value);
                    setPendingKey(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-all text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Identifier Key</label>
                  <input 
                    type="text"
                    disabled
                    value={pendingKey}
                    className="w-full bg-slate-100 border border-slate-200 px-4 py-3 rounded-xl text-sm text-text-secondary cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Category</label>
                  <select 
                    value={pendingCategory}
                    onChange={(e) => setPendingCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-all text-text-primary"
                  >
                    <option value="Navigation">Navigation</option>
                    <option value="Clicks">Clicks</option>
                    <option value="Shortcuts">Shortcuts</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Assign Execution Action</label>
                <select 
                  value={pendingAction}
                  onChange={(e) => setPendingAction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-all text-text-primary"
                >
                  <option value="left_click">Mouse Click</option>
                  <option value="right_click">Context Menu</option>
                  <option value="drag">Drag and Drop</option>
                  <option value="scroll">Scroll Up / Down</option>
                  <option value="zoom">Zoom Screen</option>
                  <option value="shortcut">Browser Hotkey</option>
                  <option value="app_launch">Launch App (Calc)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={clearPendingPattern}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-text-secondary transition-all"
              >
                Dismiss Cluster
              </button>
              <button 
                onClick={submitPendingGesture}
                disabled={!pendingName}
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2",
                  pendingName ? "bg-success hover:bg-success/90 shadow-lg shadow-success/20" : "bg-slate-300 cursor-not-allowed"
                )}
              >
                <Check className="w-4 h-4" /> Activate Mappings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. HEADER */}
      <div className="flex justify-between items-end pb-4 border-b border-accent">
        <div>
          <h1 className="text-2xl font-bold text-primary">Neural Dataset Control Center</h1>
          <p className="text-sm text-text-secondary mt-1">Manage physical gestures, feed landmark coordinates, and label custom AI behaviors</p>
        </div>
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:shadow-xl hover:shadow-primary/10 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Register New Gesture
          </button>
        ) : (
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewKey(e.target.value.toLowerCase().replace(/\s+/g, '_'));
              }}
              placeholder="Gesture Name (e.g. Wave)"
              className="bg-white border border-accent px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-primary w-48 text-text-primary"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="bg-white border border-accent px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-primary text-text-primary"
            >
              <option value="Navigation">Navigation</option>
              <option value="Clicks">Clicks</option>
              <option value="Shortcuts">Shortcuts</option>
              <option value="Cursor">Cursor</option>
            </select>
            <button onClick={createGesture} className="p-2.5 bg-success text-white rounded-xl hover:bg-success/90 transition-all"><Check className="w-4 h-4" /></button>
            <button onClick={() => setIsAdding(false)} className="p-2.5 bg-error text-white rounded-xl hover:bg-error/90 transition-all"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* 3. DETAILS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {datasets.length === 0 && (
            <div className="bg-white p-20 rounded-3xl border border-dashed border-accent flex flex-col items-center text-center">
               <Database className="w-12 h-12 text-slate-300 mb-4" />
               <p className="text-text-secondary font-bold text-sm">No gestures found. Register one to begin training.</p>
            </div>
          )}

          {datasets.map((dataset) => (
            <div 
              key={dataset.id} 
              onClick={() => !isFeeding && setActiveGestureKey(dataset.gesture_key)}
              className={cn(
                "bg-white p-6 rounded-2xl shadow-sm border flex items-center justify-between group transition-all cursor-pointer",
                activeGestureKey === dataset.gesture_key ? "border-primary ring-1 ring-primary/25 shadow-md" : "border-accent hover:border-primary/20"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                  activeGestureKey === dataset.gesture_key ? "bg-primary text-white" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white"
                )}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">{dataset.gesture_name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 text-primary">
                      <Layers className="w-3.5 h-3.5" /> 
                      <span className={cn(isFeeding && activeGestureKey === dataset.gesture_key && "animate-pulse text-success")}>
                        {dataset.samples_count} templates
                      </span>
                    </span>
                    <span className="w-1 h-1 rounded-full bg-accent" />
                    <span>Category: {dataset.gesture_category}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isFeeding && activeGestureKey === dataset.gesture_key && (
                  <span className="px-2.5 py-1 bg-success/10 text-success rounded-full text-[9px] font-black uppercase tracking-widest animate-bounce">
                    Streaming Landmarks
                  </span>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteGesture(dataset.id); }}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-error hover:bg-error/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 4. SIDEBAR STATUS */}
        <div className="space-y-6">
          <div className="bg-slate-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
            <h3 className="text-sm font-black mb-3 flex items-center gap-2 uppercase tracking-wider relative z-10">
              <RefreshCw className={cn("w-4 h-4", isFeeding && "animate-spin text-primary")} />
              Realtime Feed Panel
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed relative z-10">
              {activeGestureKey 
                ? `Ready to stream frame coordinates for '${activeGestureKey}'. Feed coordinates will save directly to training database.` 
                : "Select a gesture pattern from the left panel to initialize database coordinates streaming."}
            </p>
            
            <button 
              disabled={!activeGestureKey}
              onClick={toggleFeeding}
              className={cn(
                "w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 shadow-2xl relative z-10",
                !activeGestureKey ? "bg-slate-800 text-slate-500 cursor-not-allowed" :
                isFeeding ? "bg-error text-white hover:bg-error/90" : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
              )}
            >
              {isFeeding ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isFeeding ? "Deactivate Feed" : "Activate Feed Mode"}
            </button>

            {isFeeding && (
              <div className="mt-6 pt-5 border-t border-white/5 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Tracker Node</span>
                    <span className="text-success">{aiData.trackingStatus}</span>
                 </div>
                 <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Target Stream</span>
                    <span className="text-primary">{activeGestureKey}</span>
                 </div>
              </div>
            )}
          </div>

          {/* RETRAIN MODEL CARD */}
          <div className="bg-white p-6 rounded-3xl border border-accent shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">
                AI Model Training
              </h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Compile all current landmark templates, execute the Random Forest preprocessing pipeline, and deploy the updated classifier weights.
            </p>
            
            <button 
              onClick={() => {
                retrainModel();
                alert("AI Model retraining triggered successfully! Connected vision servers will reload automatically in a few seconds.");
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.25em] hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Retrain Classifier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
