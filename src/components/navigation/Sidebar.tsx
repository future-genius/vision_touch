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
  LogOut,
  User
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const location = useLocation();
  const { role, signOut, user } = useAuth();

  const handleNavClick = () => {
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Camera, label: 'Camera', path: '/dashboard/camera' },
    { icon: Hand, label: 'Gestures', path: '/dashboard/gestures' },
    { icon: BarChart2, label: 'Analytics', path: '/dashboard/analytics' },
  ];

  const adminItems = [
    { icon: ShieldCheck, label: 'Admin Monitor', path: '/dashboard/admin' },
    { icon: Database, label: 'Datasets', path: '/dashboard/datasets' },
  ];

  const settingsItems = [
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
    { icon: Smartphone, label: 'Mobile Sync', path: '/dashboard/mobile-sync' },
    { icon: Cloud, label: 'Cloud Sync', path: '/dashboard/cloud-sync' },
    { icon: Info, label: 'About', path: '/dashboard/about' },
  ];

  return (
    <aside className={cn(
      "w-64 bg-white border-r border-accent flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-300 md:translate-x-0",
      isMobileOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center p-2 shadow-lg shadow-primary/20 overflow-hidden">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" />
        </div>
        <h1 className="text-xl font-black text-primary tracking-tighter uppercase">VisionTouch</h1>
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
                  onClick={handleNavClick}
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
                    onClick={handleNavClick}
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
                  onClick={handleNavClick}
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

      <div className="p-4 border-t border-accent space-y-3">
        {user && (
          <Link 
            to="/dashboard/profile"
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-2xl transition-all border",
              location.pathname === '/dashboard/profile' 
                ? "bg-primary/5 border-primary/20" 
                : "border-transparent hover:bg-background"
            )}
          >
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/10 overflow-hidden flex items-center justify-center">
              {user.user_metadata.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-primary truncate">{user.user_metadata.full_name || 'Vision User'}</p>
              <p className="text-[10px] text-text-secondary truncate uppercase font-bold tracking-tighter">{role}</p>
            </div>
          </Link>
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
