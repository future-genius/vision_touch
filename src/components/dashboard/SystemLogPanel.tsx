import { Terminal } from 'lucide-react';
import { useAiStream } from '../../hooks/useAiStream';
import { cn } from '../../lib/utils';

export function SystemLogPanel() {
  const { logs } = useAiStream();

  return (
    <div className="bg-[#0F172A] rounded-3xl p-8 h-full border border-white/5 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
          <Terminal className="w-4 h-4 text-primary" />
          System Engine Logs
        </h2>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-error/40" />
          <div className="w-2 h-2 rounded-full bg-amber-400/40" />
          <div className="w-2 h-2 rounded-full bg-success/40" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-[#475569] text-[10px] font-mono italic">
            Waiting for neural engine telemetry...
          </div>
        ) : (
          <div className="space-y-3 font-mono text-[10px] leading-relaxed">
            {logs.map((log: any, index: number) => {
              const typeColors = {
                info: 'text-slate-400',
                success: 'text-success',
                warning: 'text-amber-500',
                error: 'text-error'
              };
              
              return (
                <div key={index} className={cn("flex gap-3", typeColors[log.type as keyof typeof typeColors])}>
                  <span className="opacity-30">[{log.timestamp}]</span>
                  <span className="font-medium tracking-tight">{log.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
