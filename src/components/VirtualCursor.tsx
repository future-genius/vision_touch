import { useEffect, useState, useRef } from 'react';
import { useWebVision } from '../context/WebVisionContext';
import { MousePointer2, Target } from 'lucide-react';
import { cn } from '../lib/utils';

export function VirtualCursor() {
  const { cursor, isActive } = useWebVision();
  const [clickScale, setClickScale] = useState(1);
  const wasPinchingRef = useRef(false);

  useEffect(() => {
    if (!cursor.isVisible) return;

    // Detect pinch start (falling edge) to trigger click
    if (cursor.isPinching && !wasPinchingRef.current) {
      triggerClick(cursor.x, cursor.y);
    }
    
    wasPinchingRef.current = cursor.isPinching;
    
    // Animation effect for pinch
    if (cursor.isPinching) {
      setClickScale(0.7);
    } else {
      setClickScale(1);
    }
  }, [cursor.isPinching, cursor.isVisible, cursor.x, cursor.y]);

  const triggerClick = (x: number, y: number) => {
    // Temporarily hide cursor so we don't click on the cursor itself
    const cursorElement = document.getElementById('vision-virtual-cursor');
    if (cursorElement) cursorElement.style.pointerEvents = 'none';

    // Find the element underneath the coordinates
    const element = document.elementFromPoint(x, y);
    
    if (element) {
      // Create and dispatch a synthetic mouse click event
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
      });
      element.dispatchEvent(clickEvent);
      
      // If it's a focusable element like input/button, focus it
      if (element instanceof HTMLElement) {
        element.focus();
      }
    }
  };

  if (!isActive || !cursor.isVisible) return null;

  return (
    <div 
      id="vision-virtual-cursor"
      className="fixed top-0 left-0 z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 will-change-transform"
      style={{
        transform: `translate(${cursor.x}px, ${cursor.y}px) scale(${clickScale})`,
        transition: 'transform 0.05s linear' // very fast transition for smoothing
      }}
    >
      <div className={cn(
        "relative flex items-center justify-center transition-colors duration-200",
        cursor.isPinching ? "text-success" : "text-primary"
      )}>
        {/* Glow effect behind cursor */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-md opacity-50 transition-all",
          cursor.isPinching ? "bg-success w-12 h-12 -m-2" : "bg-primary w-8 h-8"
        )} />
        
        {cursor.isPinching ? (
          <Target className="w-8 h-8 relative z-10 drop-shadow-lg" />
        ) : (
          <MousePointer2 className="w-8 h-8 relative z-10 drop-shadow-lg fill-white/20" />
        )}
      </div>
    </div>
  );
}
