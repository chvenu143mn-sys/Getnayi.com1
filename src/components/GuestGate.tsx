import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Crown } from 'lucide-react';

interface GuestGateProps {
  type?: 'upload' | 'profile' | 'action';
  title?: string;
  description?: string;
  onClose?: () => void;
}

export function GuestGate({ type, title, description, onClose }: GuestGateProps) {
  const navigate = useNavigate();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      (window.history.state && window.history.state.idx > 0) ? navigate(-1) : navigate('/', { replace: true });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0c0e] overflow-hidden font-sans">
      
      {/* Solid System Background */}
      <div className="absolute inset-0 z-0 bg-[#0c0c0e]" />

      {/* Back button (Matches Auth.tsx) */}
      <button type="button"
        onClick={handleClose}
        className="absolute top-4 left-4 z-20 size-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 text-white active:scale-95 transition-all"
        aria-label="Go back"
      >
        <ArrowLeft className="size-5" />
      </button>
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 flex flex-col w-full max-w-[360px] p-6 sm:p-8 items-center rounded-[32px] border border-transparent hover:bg-white/[0.02] hover:border-white/[0.05] hover:shadow-[0_0_60px_rgba(239,41,80,0.15)] transition-colors duration-500 relative"
      >
        <div className="text-center mb-[34px] flex flex-col items-center">
          <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ delay: 0.1, duration: 0.5 }}
             className="mb-6 size-[56px] rounded-2xl flex items-center justify-center border border-white/15 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-md shrink-0 shadow-[0_0_30px_rgba(239,41,80,0.15)] relative overflow-hidden box-border"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#d9183b]/20 to-transparent opacity-50" />
            <Crown className="size-7 text-white drop-shadow-md z-10" strokeWidth={1.5} />
          </motion.div>

          <motion.h1 
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-[28px] font-sans font-bold tracking-wide text-white leading-[1.2] text-center"
          >
            {title || "Elevate your"}
            {!title && <><br/>Getnayi experience</>}
          </motion.h1>

          {(description || !title) && (
             <motion.p 
               initial={{ y: 5, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.3, duration: 0.5 }}
               className="text-[15px] font-sans text-white/70 leading-relaxed font-medium tracking-wide mt-3.5 text-center"
             >
               {description || "Create a free account to unlock exclusive features and join our vibrant community."}
             </motion.p>
          )}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full flex justify-center mb-16"
        >
          <div className="flex flex-col gap-y-5 w-[85%]">
            {[
              "Curate your personal wishlist",
              "Connect with visionary creators",
              "Engage in vibrant discussions",
              "Discover tailored recommendations"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-x-3.5 text-white/95">
                 <div className="size-5 shrink-0 rounded-full bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-sm">
                   <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                 </div>
                 <span className="text-[14.5px] font-medium tracking-wide leading-tight">{text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5, duration: 0.5 }}
           className="w-full flex flex-col items-center gap-y-4 mt-4"
        >
          <button type="button" aria-label="button" 
            onClick={() => navigate('/auth')}
            className="w-full py-[15px] px-4 flex justify-center items-center bg-[#d9183b] text-white font-bold font-sans rounded-xl hover:bg-[#f4284d] transition-all active:scale-[0.98] shadow-lg text-[15px] tracking-wide"
          >
             Join Getnayi
          </button>

          <button type="button" aria-label="button" 
            onClick={handleClose}
            className="text-[14px] font-sans font-medium text-white/60 hover:text-white transition-colors tracking-wide mt-1"
          >
            Maybe later
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
}

