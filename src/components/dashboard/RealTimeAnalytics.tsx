import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAiStream } from '../../hooks/useAiStream';
import { Activity, Zap, Cpu } from 'lucide-react';

export function RealTimeAnalytics() {
  const { data } = useAiStream();
  const [history, setHistory] = useState<{ time: string; confidence: number; fps: number }[]>([]);

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
    </div>
  );
}
