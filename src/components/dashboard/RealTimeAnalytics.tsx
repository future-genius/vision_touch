import { useEffect, useState } from 'react';
import { BarChart2 } from 'lucide-react';
import { useAiStream } from '../../hooks/useAiStream';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function RealTimeAnalytics() {
  const { data } = useAiStream();
  const [history, setHistory] = useState<{ time: string; confidence: number; fps: number }[]>([]);

  useEffect(() => {
    setHistory((prev) => {
      const now = new Date();
      const timeStr = `${now.getSeconds()}.${now.getMilliseconds()}`.substring(0, 4);
      const newEntry = { time: timeStr, confidence: data.confidence, fps: data.fps };
      const newHistory = [...prev, newEntry];
      if (newHistory.length > 20) {
        newHistory.shift();
      }
      return newHistory;
    });
  }, [data.confidence, data.fps]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-accent p-4 md:p-6 flex flex-col h-full">
      <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-6">
        <BarChart2 className="w-5 h-5 text-primary" />
        Performance Analytics
      </h2>

      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorFps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" stroke="#CBD5E1" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#CBD5E1" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
              itemStyle={{ fontWeight: 600 }}
            />
            <Area 
              type="monotone" 
              dataKey="confidence" 
              stroke="#1E3A5F" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorConfidence)" 
              name="Confidence (%)"
              isAnimationActive={false}
            />
            <Area 
              type="monotone" 
              dataKey="fps" 
              stroke="#16A34A" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorFps)" 
              name="FPS"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-text-secondary">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/20 border border-primary"></div>
            Confidence
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success/20 border border-success"></div>
            FPS Rate
         </div>
      </div>
    </div>
  );
}
