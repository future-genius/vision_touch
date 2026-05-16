import { Hand, MousePointer2, Move, MousePointerClick, ScrollText } from 'lucide-react';

const gestureLibrary = [
  { name: 'Index Pointer', icon: MousePointer2, action: 'Cursor Movement', color: 'text-blue-500', bg: 'bg-blue-50' },
  { name: 'Pinch/Click', icon: MousePointerClick, action: 'Left Click', color: 'text-amber-500', bg: 'bg-amber-50' },
  { name: 'Two Finger Spread', icon: Move, action: 'Drag & Drop', color: 'text-purple-500', bg: 'bg-purple-50' },
  { name: 'Palm Open', icon: Hand, action: 'Stop/Pause', color: 'text-red-500', bg: 'bg-red-50' },
  { name: 'Swipe Left/Right', icon: ScrollText, action: 'Next/Previous Tab', color: 'text-success', bg: 'bg-success/10' },
];

export function GesturesView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tighter">Gesture Definition Library</h1>
        <p className="text-text-secondary">Manage and configure mappings for recognized neural patterns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gestureLibrary.map((g, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl border border-accent hover:border-primary/20 transition-all group">
            <div className={`w-14 h-14 rounded-2xl ${g.bg} flex items-center justify-center ${g.color} mb-6 group-hover:scale-110 transition-transform`}>
              <g.icon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">{g.name}</h3>
            <p className="text-sm text-text-secondary mb-4">Mapped to: <span className="font-bold text-primary">{g.action}</span></p>
            <button className="text-xs font-black text-primary uppercase tracking-widest hover:underline">Configure Binding</button>
          </div>
        ))}
      </div>
    </div>
  );
}
