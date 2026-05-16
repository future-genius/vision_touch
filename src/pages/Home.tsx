import { useAuth } from '../context/AuthContext';
import { ArrowRight, Hand, Zap, Shield, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Hand className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-primary tracking-tighter">VisionTouch</span>
        </div>
        <div className="flex items-center gap-6">
          {!user ? (
            <Link to="/auth" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:scale-105 transition-all shadow-xl shadow-primary/20">
              Sign In
            </Link>
          ) : (
            <Link to="/" className="text-primary font-bold flex items-center gap-2 group">
              Go to {role === 'admin' ? 'Admin Dashboard' : 'User Panel'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Enterprise AI v4.0</span>
          </div>
          <h1 className="text-6xl lg:text-8xl font-black text-primary leading-[0.9] tracking-tighter">
            Control the World <br />
            <span className="text-text-secondary/20">Without Touching It.</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-lg leading-relaxed">
            Professional AI gesture interface for medical, research, and high-performance workstation control. Real-time sub-10ms latency.
          </p>
          <div className="flex gap-4">
            <Link to="/auth" className="bg-primary text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-primary/30 transition-all flex items-center gap-3">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="px-8 py-4 rounded-2xl font-bold text-lg border border-accent hover:bg-white transition-all">
              Watch Demo
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full" />
          <div className="relative bg-white p-4 rounded-[40px] shadow-2xl border border-accent overflow-hidden">
             <img 
               src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070" 
               alt="AI Interface" 
               className="rounded-[32px] w-full aspect-[4/3] object-cover"
             />
             <div className="absolute bottom-10 left-10 right-10 bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-primary rounded-2xl text-white">
                      <Zap className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-xs font-bold text-text-secondary uppercase">Processing Speed</p>
                      <p className="text-2xl font-black text-primary">8.4ms Latency</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-32">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: Shield, title: 'Enterprise Security', desc: 'Bank-grade encryption and secure Google OAuth integration.' },
            { icon: Globe, title: 'Cross Platform', desc: 'Seamlessly works on Windows, MacOS, and mobile PWA.' },
            { icon: Zap, title: 'Real-time Sync', desc: 'Sync gesture datasets across all your devices instantly.' },
          ].map((f, i) => (
            <div key={i} className="space-y-4 p-8 rounded-3xl border border-accent hover:border-primary/20 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <f.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-primary">{f.title}</h3>
              <p className="text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
