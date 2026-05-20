import { useState } from 'react';
import { Keyboard, Delete, CornerDownLeft, Space } from 'lucide-react';
import { useWebVision } from '../context/WebVisionContext';
import { useAiStream } from '../hooks/useAiStream';

export function SpatialOverlay() {
  const { data } = useAiStream();
  const [typedText, setTypedText] = useState('');
  const [isOverlayOpen, setIsOverlayOpen] = useState(true);

  // Keyboard layout rows
  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.'];

  const handleKeyPress = (char: string) => {
    setTypedText(prev => prev + char);
  };

  const handleBackspace = () => {
    setTypedText(prev => prev.slice(0, -1));
  };

  const handleSpace = () => {
    setTypedText(prev => prev + ' ');
  };

  const handleClear = () => {
    setTypedText('');
  };

  if (!isOverlayOpen) {
    return (
      <button
        onClick={() => setIsOverlayOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-all flex items-center gap-2 font-bold text-xs tracking-wider uppercase"
      >
        <Keyboard className="w-5 h-5" />
        Open Spatial Overlay
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-slate-950/15 backdrop-blur-[1px]">
      <div className="w-[650px] bg-white/75 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-6 pointer-events-auto flex flex-col gap-6 transform hover:scale-[1.01] transition-all duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-white shadow-md">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-md font-extrabold text-slate-800">Spatial Overlay Keyboard</h2>
              <p className="text-[10px] text-slate-500 font-medium">Use virtual pointer hover & click to type</p>
            </div>
          </div>
          <button
            onClick={() => setIsOverlayOpen(false)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-200/40 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg transition-all"
          >
            Minimize
          </button>
        </div>

        {/* Text Input Box */}
        <div className="relative">
          <textarea
            value={typedText}
            readOnly
            placeholder="Hover & click the keys below to type spatial text..."
            className="w-full h-24 bg-white/80 border border-slate-200 rounded-2xl p-4 text-sm font-semibold text-slate-700 shadow-inner focus:outline-none resize-none placeholder-slate-400"
          />
          {typedText && (
            <button
              onClick={handleClear}
              className="absolute bottom-3 right-3 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2.5 py-1 rounded-md transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Keyboard Layout */}
        <div className="flex flex-col gap-2">
          {/* Row 1 */}
          <div className="flex gap-1.5 justify-center">
            {row1.map(key => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="w-12 h-12 bg-white/90 hover:bg-primary hover:text-white border border-slate-200 rounded-xl font-bold text-slate-700 transition-all shadow-sm active:scale-95 text-sm"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Row 2 */}
          <div className="flex gap-1.5 justify-center">
            {row2.map(key => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="w-12 h-12 bg-white/90 hover:bg-primary hover:text-white border border-slate-200 rounded-xl font-bold text-slate-700 transition-all shadow-sm active:scale-95 text-sm"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Row 3 */}
          <div className="flex gap-1.5 justify-center">
            <button
              onClick={handleBackspace}
              className="w-16 h-12 bg-slate-100 hover:bg-error hover:text-white border border-slate-200 rounded-xl font-bold text-slate-600 flex items-center justify-center transition-all shadow-sm active:scale-95"
            >
              <Delete className="w-5 h-5" />
            </button>
            {row3.map(key => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="w-12 h-12 bg-white/90 hover:bg-primary hover:text-white border border-slate-200 rounded-xl font-bold text-slate-700 transition-all shadow-sm active:scale-95 text-sm"
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('!')}
              className="w-12 h-12 bg-white/90 hover:bg-primary hover:text-white border border-slate-200 rounded-xl font-bold text-slate-700 transition-all shadow-sm active:scale-95 text-sm"
            >
              !
            </button>
          </div>

          {/* Control Row */}
          <div className="flex gap-1.5 justify-center mt-1">
            <button
              onClick={handleSpace}
              className="w-72 h-12 bg-white/90 hover:bg-primary hover:text-white border border-slate-200 rounded-xl font-bold text-slate-700 flex items-center justify-center transition-all shadow-sm active:scale-95"
            >
              <Space className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleKeyPress('\n')}
              className="w-20 h-12 bg-blue-100 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-xl font-extrabold text-blue-700 flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95 text-xs"
            >
              <CornerDownLeft className="w-4 h-4" />
              Enter
            </button>
          </div>
        </div>

        {/* Footer info/diagnostics bar inside overlay */}
        <div className="flex justify-between items-center bg-slate-50/80 rounded-2xl p-3 border border-slate-200/50 text-[10px] text-slate-500 font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span>Active Gesture: <strong className="text-primary font-bold">{data.gesture || 'None'}</strong></span>
          </div>
          <div>
            <span>Voice Status: <strong className="text-purple-600 font-bold">{data.voiceCommand !== 'None' ? data.voiceCommand : 'Ready'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
