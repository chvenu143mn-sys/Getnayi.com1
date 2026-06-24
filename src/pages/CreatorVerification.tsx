import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { GlobalBackButton } from '../components/GlobalBackButton';

export default function CreatorVerification() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white font-sans flex flex-col h-full bg-[#0c0c0e]">
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-4">
        <GlobalBackButton className="p-2 -ml-2 bg-transparent hover:bg-white/5 border-transparent" />
        <div className="flex-1 text-center pr-8">
           <h2 className="text-[17px] font-semibold text-white tracking-wide">Creator Verification</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 flex flex-col items-center">
        {/* Progress Steps */}
        <div className="w-full flex items-center justify-between max-w-[280px] mt-6 mb-12 relative px-2">
           <div className="absolute top-[18px] left-[30px] right-[30px] h-0.5 bg-zinc-800 -z-10" />
           
           <div className="flex flex-col items-center gap-2">
             <div className="size-[38px] rounded-full bg-[#d9183b] text-white flex items-center justify-center font-bold text-[15px] shadow-[0_0_15px_rgba(239,41,80,0.3)]">
               1
             </div>
             <span className="text-[14px] font-medium text-white tracking-wide">Apply</span>
           </div>

           <div className="flex flex-col items-center gap-2">
             <div className="size-[38px] rounded-full bg-[#1c1c1e] text-zinc-400 font-bold text-[15px] flex items-center justify-center border border-white/5">
               2
             </div>
             <span className="text-[14px] font-medium text-zinc-500 tracking-wide">Review</span>
           </div>

           <div className="flex flex-col items-center gap-2">
             <div className="size-[38px] rounded-full bg-[#1c1c1e] text-zinc-400 font-bold text-[15px] flex items-center justify-center border border-white/5">
               3
             </div>
             <span className="text-[14px] font-medium text-zinc-500 tracking-wide">Verified</span>
           </div>
        </div>

        {/* Hero Icon */}
        <div className="relative mb-8">
           <div className="absolute inset-0 bg-[#d9183b]/20 blur-2xl rounded-full" />
           <div className="relative bg-gradient-to-br from-orange-400 to-[#d9183b] size-[100px] rounded-[30px] rotate-[15deg] flex items-center justify-center p-[4px] shadow-lg">
              <div className="bg-[#1c1c1e] size-full rounded-[26px] flex items-center justify-center -rotate-[15deg]">
                 <svg className="size-12 text-[#d9183b]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                 </svg>
              </div>
           </div>
        </div>

        <h3 className="text-[22px] font-semibold text-white tracking-wide mb-3 text-center">
          Build trust. Get verified.
        </h3>
        <p className="text-[15px] text-zinc-400 tracking-wide text-center leading-relaxed max-w-[280px] mb-10">
          Verification helps your audience trust your recommendations.
        </p>

        {/* Checklist */}
        <div className="w-full bg-[#151518] border border-white/5 rounded-3xl p-6 flex flex-col gap-5 mb-8 shadow-sm">
           {[
             'Verify your identity',
             'Link social accounts',
             'Show real presence',
             'Agree to guidelines'
           ].map((text, i) => (
             <div key={i} className="flex items-center gap-4">
                <CheckCircle2 className="size-6 text-[#d9183b]/80 shrink-0" strokeWidth={1.5} />
                <span className="text-[15px] font-medium text-white/90 tracking-wide">{text}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Bottom Button */}
      <div className="px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4">
        <button type="button" aria-label="button"  onClick={() => navigate('/upload')} className="w-full py-[18px] bg-[#d9183b] text-white font-semibold text-[16px] tracking-wide rounded-2xl flex items-center justify-center hover:bg-[#d9183b]/90 transition-colors active:scale-[0.98] shadow-md">
           Start Verification
        </button>
      </div>
    </div>
  );
}
