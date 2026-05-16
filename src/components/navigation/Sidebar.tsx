import { 
  LayoutDashboard, 
  Camera, 
  Hand, 
  BarChart2, 
  Settings, 
  Smartphone, 
  Cloud, 
  Info,
  ShieldCheck,
  Database,
  LogOut
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
  const location = useLocation();
  const { role, signOut, user } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Camera, label: 'Camera', path: '/camera' },
    { icon: Hand, label: 'Gestures', path: '/gestures' },
    { icon: BarChart2, label: 'Analytics', path: '/analytics' },
  ];

  const adminItems = [
    { icon: ShieldCheck, label: 'Admin Monitor', path: '/admin' },
    { icon: Database, label: 'Datasets', path: '/datasets' },
  ];

  const settingsItems = [
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: Smartphone, label: 'Mobile Sync', path: '/mobile-sync' },
    { icon: Cloud, label: 'Cloud Sync', path: '/cloud-sync' },
    { icon: Info, label: 'About', path: '/about' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-accent flex flex-col h-screen fixed left-0 top-0 hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Hand className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-primary tracking-tight">VisionTouch</h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
        {/* Main Menu */}
        <div>
          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-4 px-3 opacity-50">Main Menu</div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold",
                    isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-text-secondary hover:bg-background hover:text-text-primary"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Admin Section */}
        {role === 'admin' && (
          <div>
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-4 px-3 opacity-50">Administration</div>
            <div className="space-y-1">
              {adminItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold",
                      isActive 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "text-text-secondary hover:bg-background hover:text-text-primary"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Settings & Info */}
        <div>
          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-4 px-3 opacity-50">Configuration</div>
          <div className="space-y-1">
            {settingsItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold",
                    isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-text-secondary hover:bg-background hover:text-text-primary"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-accent space-y-4">
        {user && (
          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-accent border border-white overflow-hidden">
              {user.user_metadata.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xs uppercase">
                  {user.email?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{user.user_metadata.full_name || 'Vision User'}</p>
              <p className="text-[10px] text-text-secondary truncate uppercase font-bold tracking-tighter">{role}</p>
            </div>
          </div>
        )}
        <button 
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-error hover:bg-error/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
