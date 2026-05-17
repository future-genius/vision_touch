import { useState, useEffect } from 'react';
import { Hand, MousePointer2, Move, MousePointerClick, ScrollText, Sliders, Check, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAiStream } from '../hooks/useAiStream';
import { cn } from '../lib/utils';

interface GestureMapping {
  gesture_id: string;
  gesture_name: string;
  gesture_key: string;
  gesture_icon: string;
  gesture_category: string;
  action_id: string | null;
  action_name: string;
  action_type: string;
  sensitivity: number;
  cooldown: number;
  active_status: boolean;
}

export function GesturesView() {
  const { triggerHotReload } = useAiStream();
  const [mappings, setMappings] = useState<GestureMapping[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form edit states
  const [selectedActionId, setSelectedActionId] = useState<string>('');
  const [sens, setSens] = useState<number>(1.0);
  const [cool, setCool] = useState<number>(0.4);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // 1. Fetch Gestures
      const { data: gestures } = await supabase.from('gestures').select('*');
      // 2. Fetch Actions
      const { data: actionsData } = await supabase.from('actions').select('*');
      if (actionsData) setActions(actionsData);
      
      // 3. Fetch Mappings
      const { data: maps } = await supabase.from('gesture_action_map').select('*');
      
      if (gestures) {
        const joined: GestureMapping[] = gestures.map(g => {
          const map = maps?.find(m => m.gesture_id === g.id);
          const act = actionsData?.find(a => a.id === map?.action_id);
          
          return {
            gesture_id: g.id,
            gesture_name: g.gesture_name,
            gesture_key: g.gesture_key,
            gesture_icon: g.gesture_icon || 'Hand',
            gesture_category: g.gesture_category || 'Custom',
            action_id: act?.id || null,
            action_name: act?.action_name || 'Idle / Not Mapped',
            action_type: act?.action_type || 'none',
            sensitivity: map?.sensitivity ?? 1.0,
            cooldown: map?.cooldown ?? 0.4,
            active_status: map?.active_status ?? true
          };
        });
        setMappings(joined);
      }
    } catch (e) {
      console.error("Error loading registry:", e);
    }
  }

  const startEditing = (m: GestureMapping) => {
    setEditingId(m.gesture_id);
    setSelectedActionId(m.action_id || '');
    setSens(m.sensitivity);
    setCool(m.cooldown);
  };

  const saveBinding = async (gestureId: string) => {
    if (!selectedActionId) return;

    try {
      // Check if map already exists
      const { data: existing } = await supabase
        .from('gesture_action_map')
        .select('*')
        .eq('gesture_id', gestureId);

      if (existing && existing.length > 0) {
        // Update
        await supabase
          .from('gesture_action_map')
          .update({
            action_id: selectedActionId,
            sensitivity: sens,
            cooldown: cool,
            active_status: true
          })
          .eq('gesture_id', gestureId);
      } else {
        // Insert
        await supabase
          .from('gesture_action_map')
          .insert([{
            gesture_id: gestureId,
            action_id: selectedActionId,
            sensitivity: sens,
            cooldown: cool,
            active_status: true
          }]);
      }

      setEditingId(null);
      fetchData();
      
      // Instantly hot reload active predictions in the engine!
      setTimeout(triggerHotReload, 500);
    } catch (e) {
      console.error("Error updating bindings:", e);
    }
  };

  // Map icon strings to Lucide components
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'MousePointer2': return MousePointer2;
      case 'MousePointerClick': return MousePointerClick;
      case 'Move': return Move;
      case 'ScrollText': return ScrollText;
      default: return Hand;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end pb-4 border-b border-accent">
        <div>
          <h1 className="text-2xl font-bold text-primary">Neural Action Registry</h1>
          <p className="text-sm text-text-secondary mt-1">Bind recognized hand gestures to high-precision system events and shortcut commands</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh registry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mappings.map((g) => {
          const IconComp = getIcon(g.gesture_icon);
          const isEditing = editingId === g.gesture_id;

          return (
            <div 
              key={g.gesture_id} 
              className={cn(
                "bg-white p-6 rounded-3xl border transition-all flex flex-col justify-between",
                isEditing ? "border-primary ring-1 ring-primary/20 shadow-md" : "border-accent hover:border-primary/10 shadow-sm"
              )}
            >
              <div>
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-5",
                  g.gesture_category === 'Clicks' ? "bg-amber-50 text-amber-500" :
                  g.gesture_category === 'Cursor' ? "bg-blue-50 text-blue-500" :
                  g.gesture_category === 'Shortcuts' ? "bg-purple-50 text-purple-500" : "bg-slate-50 text-slate-500"
                )}>
                  <IconComp className="w-6 h-6" />
                </div>
                
                <h3 className="text-lg font-bold text-text-primary">{g.gesture_name}</h3>
                
                {!isEditing ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-text-secondary font-medium">
                      Action Type: <span className="font-bold text-primary">{g.action_name}</span>
                    </p>
                    <div className="flex gap-4 text-[10px] font-bold text-text-secondary uppercase mt-2">
                      <span>Sensitivity: {g.sensitivity}x</span>
                      <span>Cooldown: {g.cooldown}s</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Target Action</label>
                      <select 
                        value={selectedActionId}
                        onChange={(e) => setSelectedActionId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                      >
                        <option value="">-- Select System Action --</option>
                        {actions.map(a => (
                          <option key={a.id} value={a.id}>{a.action_name} ({a.action_type})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Sensitivity ({sens}x)</label>
                        <input 
                          type="range"
                          min="0.5"
                          max="3.0"
                          step="0.1"
                          value={sens}
                          onChange={(e) => setSens(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Cooldown ({cool}s)</label>
                        <input 
                          type="range"
                          min="0.1"
                          max="2.0"
                          step="0.1"
                          value={cool}
                          onChange={(e) => setCool(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2">
                {!isEditing ? (
                  <button 
                    onClick={() => startEditing(g)}
                    className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <Sliders className="w-4 h-4" /> Configure Binding
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => saveBinding(g.gesture_id)}
                      className="px-3 py-1.5 bg-success text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-success/90 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
