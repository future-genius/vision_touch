import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';

export function MainLayout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-accent">
          <h1 className="text-lg font-bold text-primary tracking-tight">VisionTouch</h1>
          {/* Add a simple hamburger menu toggle here in a real app */}
        </header>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
