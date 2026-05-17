import { Info, Code2, Copyright, CheckCircle2, Box, Cpu } from 'lucide-react';

export function About() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end pb-4 border-b border-accent">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Info className="w-7 h-7" /> System Information
          </h1>
          <p className="text-sm text-text-secondary mt-1">Application version, licenses, and architecture details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Branding */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-accent shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            
            <div className="w-32 h-32 bg-slate-950 rounded-3xl flex items-center justify-center shadow-xl flex-shrink-0 relative z-10">
              <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain brightness-0 invert" />
            </div>
            
            <div className="flex-1 text-center md:text-left relative z-10">
              <div className="inline-block px-3 py-1 bg-success/10 text-success text-[10px] font-black uppercase tracking-widest rounded-full mb-3">
                Production Release
              </div>
              <h2 className="text-3xl font-black text-text-primary tracking-tight">VisionTouch</h2>
              <p className="text-sm font-semibold text-text-secondary mt-2">Enterprise AI Human-Computer Interaction Platform</p>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Frontend Version</p>
                  <p className="text-sm font-black text-text-primary mt-1">v2.1.4 (React PWA)</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Engine Version</p>
                  <p className="text-sm font-black text-text-primary mt-1">Neural v4.2 (Python)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-accent shadow-sm">
             <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
               <Cpu className="w-5 h-5 text-primary" /> Core Technologies
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[
                 { title: 'Google MediaPipe', desc: 'Real-time hand landmark tracking and geometry extraction.' },
                 { title: 'OpenCV', desc: 'Hardware-accelerated camera stream processing.' },
                 { title: 'Supabase', desc: 'PostgreSQL database and real-time cloud synchronization.' },
                 { title: 'React & Tailwind', desc: 'High-performance interactive web dashboard.' },
               ].map((tech, i) => (
                 <div key={i} className="flex gap-3">
                   <div className="mt-0.5"><CheckCircle2 className="w-4 h-4 text-success" /></div>
                   <div>
                     <p className="text-xs font-bold text-text-primary">{tech.title}</p>
                     <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">{tech.desc}</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Legal & Credits */}
        <div className="space-y-6">
          <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-xl">
             <h3 className="text-sm font-bold uppercase tracking-widest mb-6 opacity-60 flex items-center gap-2">
               <Code2 className="w-4 h-4" /> Developers
             </h3>
             <div className="space-y-4">
               <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">FG</div>
                 <div>
                   <p className="text-sm font-bold text-slate-200">Future Genius</p>
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Core Engineering</p>
                 </div>
               </div>
             </div>
             
             <div className="mt-8 pt-6 border-t border-white/10">
               <h3 className="text-sm font-bold uppercase tracking-widest mb-4 opacity-60 flex items-center gap-2">
                 <Copyright className="w-4 h-4" /> License
               </h3>
               <p className="text-[10px] text-slate-400 leading-relaxed">
                 © 2026 VisionTouch AI. All rights reserved. Proprietary enterprise software. Unauthorized distribution, modification, or reverse engineering is strictly prohibited.
               </p>
             </div>
          </div>
          
          <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl text-primary text-center">
             <Box className="w-8 h-8 mx-auto mb-3 opacity-80" />
             <p className="text-xs font-bold leading-relaxed">
               Built for high-performance human-computer interaction workflows.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
