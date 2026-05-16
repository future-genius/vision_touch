import { 
  LayoutDashboard, 
  Camera, 
  Hand, 
  BarChart2, 
  Settings, 
  Smartphone, 
  Cloud, 
  Info 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Camera, label: 'Camera', path: '/camera' },
  { icon: Hand, label: 'Gestures', path: '/gestures' },
  { icon: BarChart2, label: 'Analytics', path: '/analytics' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: Smartphone, label: 'Mobile Sync', path: '/mobile-sync' },
  { icon: Cloud, label: 'Cloud Sync', path: '/cloud-sync' },
  { icon: Info, label: 'About', path: '/about' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-accent flex flex-col h-screen fixed left-0 top-0 hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
          <Hand className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-primary tracking-tight">VisionTouch</h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4 px-2">Menu</div>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                isActive 
                  ? "bg-primary text-white" 
                  : "text-text-secondary hover:bg-accent hover:text-text-primary"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-accent">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-success"></div>
          <span className="text-xs font-medium text-text-secondary">System Online</span>
        </div>
      </div>
    </aside>
  );
}
