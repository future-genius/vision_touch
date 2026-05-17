import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Menu, X, Camera, CameraOff } from 'lucide-react';
import { useWebVision } from '../context/WebVisionContext';

export function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isActive, startCamera, stopCamera, error } = useWebVision();

  return (
    <div className="flex h-screen bg-background relative">
      <Sidebar isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />
      
      <main className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-white border-b border-accent z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 -ml-2 text-primary hover:bg-background rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-lg font-black text-primary tracking-tighter uppercase md:hidden">VisionTouch</h1>
            <h1 className="text-lg font-black text-primary tracking-tighter uppercase hidden md:block">Dashboard Workspace</h1>
          </div>

          <button 
            onClick={isActive ? stopCamera : startCamera}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              isActive 
                ? 'bg-success/10 text-success border border-success/20' 
                : 'bg-primary text-white shadow-lg hover:bg-primary/90'
            }`}
          >
            {isActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            {isActive ? 'Gestures Active' : 'Enable Gestures'}
          </button>
        </header>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {error && (
              <div className="bg-error/10 border border-error/20 text-error p-4 rounded-2xl text-sm font-semibold flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-error animate-ping" />
                <p>{error}</p>
              </div>
            )}
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
