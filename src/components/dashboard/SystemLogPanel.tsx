import { Terminal } from 'lucide-react';
import { useAiStream } from '../../hooks/useAiStream';
import { cn } from '../../lib/utils';

export function SystemLogPanel() {
  const { logs } = useAiStream();

  return (
    <div className="bg-text-primary rounded-xl shadow-sm border border-text-primary p-4 md:p-6 flex flex-col h-full text-white">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-accent">
        <Terminal className="w-5 h-5 text-accent" />
        System Logs
      </h2>

      <div className="flex-1 bg-[#1A2235] rounded-lg p-3 font-mono text-xs overflow-y-auto min-h-[150px] border border-white/10 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-text-secondary/50 h-full flex items-center justify-center">
            Waiting for logs...
          </div>
        ) : (
          <ul className="space-y-1">
            {logs.map((log, index) => {
              const isWarning = log.includes('Warning');
              const isError = log.includes('Error');
              return (
                <li 
                  key={index} 
                  className={cn(
                    "break-all",
                    isWarning ? "text-amber-400" : isError ? "text-error" : "text-[#A0AEC0]"
                  )}
                >
                  <span className="opacity-50 select-none mr-2">{'>'}</span>
                  {log}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
