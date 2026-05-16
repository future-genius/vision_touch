import { User, Mail, Shield, Clock, Smartphone, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAiStream } from '../hooks/useAiStream';

export function Profile() {
  const { user, role } = useAuth();
  const { data } = useAiStream();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tighter uppercase">User Profile</h1>
        <p className="text-text-secondary">Manage your account and real-time session telemetry</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[40px] border border-accent shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
            
            <div className="w-32 h-32 rounded-[32px] bg-primary flex items-center justify-center text-white relative z-10 shadow-2xl shadow-primary/20">
              <User className="w-16 h-16" />
            </div>

            <div className="flex-1 space-y-4 text-center md:text-left relative z-10">
              <div className="space-y-1">
                 <h2 className="text-3xl font-black text-primary tracking-tighter">{user?.email?.split('@')[0]}</h2>
                 <p className="text-sm font-bold text-text-secondary uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                    <Shield className="w-4 h-4 text-primary" /> {role} Account
                 </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <Mail className="w-4 h-4" /> {user?.email}
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <Clock className="w-4 h-4" /> Joined: {new Date(user?.created_at || '').toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Session Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[40px] border border-accent shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-success/10 rounded-2xl text-success">
                   <Activity className="w-5 h-5" />
                 </div>
                 <h3 className="font-black text-primary uppercase tracking-widest text-xs">Live Connection</h3>
               </div>
               <div className="space-y-1">
                 <p className="text-3xl font-black text-primary tracking-tighter">
                   {data.trackingStatus === 'Active' ? 'OPTIMIZED' : 'STANDBY'}
                 </p>
                 <p className="text-xs text-text-secondary font-bold uppercase">Real-time Engine Status</p>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-accent shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-primary/5 rounded-2xl text-primary">
                   <Smartphone className="w-5 h-5" />
                 </div>
                 <h3 className="font-black text-primary uppercase tracking-widest text-xs">Device Sync</h3>
               </div>
               <div className="space-y-1">
                 <p className="text-3xl font-black text-primary tracking-tighter">SYNCED</p>
                 <p className="text-xs text-text-secondary font-bold uppercase">Multi-device Node Active</p>
               </div>
            </div>
          </div>
        </div>

        {/* Security / Actions */}
        <div className="space-y-6">
           <div className="bg-primary p-10 rounded-[50px] text-white shadow-2xl shadow-primary/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
              <h3 className="text-xl font-black tracking-tighter mb-4">Security Center</h3>
              <p className="text-xs text-white/70 mb-8 leading-relaxed">Your account is protected by enterprise-grade OAuth 2.0 encryption.</p>
              <button className="w-full py-4 bg-white text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
                Update Credentials
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
