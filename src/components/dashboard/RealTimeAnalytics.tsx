import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell } from 'recharts';
import { useAiStream } from '../../hooks/useAiStream';
import { Activity, Zap, Cpu, Compass, Mic, Monitor } from 'lucide-react';

export function RealTimeAnalytics() {
  const { data } = useAiStream();
  const [history, setHistory] = useState<{ time: string; confidence: number; fps: number }[]>([]);
  const [gestureCounts, setGestureCounts] = useState<{ [key: string]: number }>({
    OPEN_PALM: 0,
    INDEX_ONLY: 0,
    INDEX_MIDDLE_EXTENDED: 0,
    INDEX_THUMB_PINCH: 0,
    MIDDLE_THUMB_PINCH: 0,
    FIST: 0,
  });

  useEffect(() => {
    if (data.gesture && data.gesture !== 'None') {
      setGestureCounts((prev) => {
        const key = data.gesture;
        if (key in prev) {
          return {
            ...prev,
            [key]: prev[key] + 1,
          };
        }
        return prev;
      });
    }
  }, [data.gesture]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHistory((prev) => {
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        const newEntry = { time: timeStr, confidence: data.confidence, fps: data.fps };
        const newHistory = [...prev, newEntry];
        return newHistory.slice(-20);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [data.confidence, data.fps]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Multimodal Telemetry & System Diagnostics */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-accent grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* Active Application Context */}
        <div className="flex flex-col justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-text-secondary font-medium">App Context</p>
              <h3 className="text-lg font-extrabold text-text-primary mt-0.5">
                {data.activeApp || 'General'}
              </h3>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
              {data.activeApp === 'General' ? 'Standard Controls' : 'Custom Profile Active'}
            </span>
          </div>
        </div>

        {/* Voice Command Module */}
        <div className="flex flex-col justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${data.voiceCommand && data.voiceCommand !== 'None' ? 'bg-purple-100 text-purple-700 animate-pulse' : 'bg-slate-200 text-slate-600'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-text-secondary font-medium">Voice Command (Vosk)</p>
              <h3 className={`text-lg font-extrabold mt-0.5 ${data.voiceCommand && data.voiceCommand !== 'None' ? 'text-purple-700' : 'text-text-primary'}`}>
                {data.voiceCommand && data.voiceCommand !== 'None' ? data.voiceCommand.toUpperCase() : 'Listening...'}
              </h3>
            </div>
          </div>
          <div className="mt-4 text-[11px] font-medium text-slate-500">
            Say <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-purple-600 font-bold">"Vision [command]"</code> (e.g. click, scroll)
          </div>
        </div>

        {/* Gaze & Head Pose Estimation Crosshair */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-text-secondary font-medium">Head Gaze Assist</p>
                <span className="text-xs font-mono font-bold text-emerald-600">
                  P: {data.headPitch ? data.headPitch.toFixed(2) : '0.00'} | Y: {data.headYaw ? data.headYaw.toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4">
              Pitch/Yaw offsets assist mouse target fine-tuning.
            </p>
          </div>

          {/* Coordinate Crosshair Visualizer */}
          <div className="relative w-20 h-20 bg-slate-100 rounded-full border border-slate-300 flex items-center justify-center overflow-hidden">
            <div className="absolute w-full h-px bg-slate-300/60"></div>
            <div className="absolute h-full w-px bg-slate-300/60"></div>
            <div className="absolute w-12 h-12 rounded-full border border-dashed border-slate-300/50"></div>
            <div 
              className="absolute w-3 h-3 bg-emerald-500 rounded-full shadow transition-all duration-75 ease-out"
              style={{ 
                transform: `translate(${data.headYaw * 30}px, ${data.headPitch * 30}px)` 
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-accent">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Inference Confidence
            </h2>
            <span className="text-[10px] font-black text-success bg-success/10 px-2 py-1 rounded">LIVE</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis hide dataKey="time" />
                <YAxis domain={[0, 100]} hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1E3A5F', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="confidence" 
                  stroke="#1E3A5F" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorConf)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-accent">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              Engine Performance (FPS)
            </h2>
            <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis hide dataKey="time" />
                <YAxis domain={[0, 60]} hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="step" 
                  dataKey="fps" 
                  stroke="#16A34A" 
                  strokeWidth={3} 
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gesture Usage Distribution Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-accent col-span-1 md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Gesture Usage Distribution
            </h2>
            <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded">SESSION METRICS</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gesture Realtime Monitor Grid */}
            <div className="lg:col-span-1 grid grid-cols-2 gap-3">
              {Object.keys(gestureCounts).map((key) => {
                const isActive = data.gesture === key;
                const count = gestureCounts[key];
                const displayName = key.replace(/_/g, ' ');
                
                const dotColorClass = {
                  OPEN_PALM: 'bg-blue-500',
                  INDEX_ONLY: 'bg-emerald-500',
                  INDEX_MIDDLE_EXTENDED: 'bg-amber-500',
                  INDEX_THUMB_PINCH: 'bg-purple-500',
                  MIDDLE_THUMB_PINCH: 'bg-pink-500',
                  FIST: 'bg-red-500',
                }[key] || 'bg-slate-400';

                return (
                  <div 
                    key={key} 
                    className={`p-3.5 rounded-2xl border transition-all duration-300 ${isActive ? 'bg-slate-50 border-primary scale-[1.02] shadow-sm' : 'bg-white border-accent'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-text-secondary truncate block w-24 tracking-tight leading-none">
                        {displayName}
                      </span>
                      {isActive && (
                        <span className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColorClass}`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColorClass}`}></span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-extrabold tracking-tighter text-text-primary">
                        {count}
                      </span>
                      <span className="text-[9px] text-text-secondary font-semibold uppercase">hits</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Horizontal Bar Chart representation */}
            <div className="lg:col-span-2 h-64 border border-accent p-4 rounded-2xl bg-slate-50/50">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={Object.keys(gestureCounts).map((key) => ({
                    name: key.replace(/_/g, ' '),
                    count: gestureCounts[key],
                  }))}
                  margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#4B5563', fontSize: 10, fontWeight: 'bold' }} 
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1E3A5F', fontWeight: 'bold' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={14}>
                    {Object.keys(gestureCounts).map((key, idx) => {
                      const colors = {
                        OPEN_PALM: '#3B82F6',
                        INDEX_ONLY: '#10B981',
                        INDEX_MIDDLE_EXTENDED: '#F59E0B',
                        INDEX_THUMB_PINCH: '#8B5CF6',
                        MIDDLE_THUMB_PINCH: '#EC4899',
                        FIST: '#EF4444',
                      };
                      return <Cell key={`cell-${idx}`} fill={colors[key as keyof typeof colors] || '#64748B'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
