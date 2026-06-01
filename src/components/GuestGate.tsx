import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';

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
      navigate(-1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0c0e] overflow-hidden font-sans">
      {/* Blurred Background with Mock Creator Images */}
      <div className="absolute inset-0 z-0 opacity-40">
        <img 
          src="https://images.unsplash.com/photo-1516053335520-22c7a3641de0?q=80&w=800&auto=format&fit=crop" 
          alt="Background" 
          className="size-full object-cover blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/80 to-transparent" />
      </div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="z-10 flex flex-col w-full px-8 items-center pt-[10vh]"
      >
        <div className="mb-6 size-[46px] rounded-[14px] flex items-center justify-center border-2 border-white bg-transparent shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><path d="M12 15v2"/></svg>
        </div>

        <h1 className="text-[25px] font-sans font-semibold tracking-wide text-white leading-snug text-center mb-10 w-full">
          Unlock the full<br/>Getnayi experience
        </h1>

        <div className="w-full gap-y-[18px] mb-[45px] max-w-[280px]">
          <div className="flex items-center gap-x-3 text-white">
             <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="white"/><path d="M16 8.5L9.5 15L6 11.5" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
             <span className="text-[14px] font-medium tracking-wide">Save your favorite products</span>
          </div>
          <div className="flex items-center gap-x-3 text-white">
             <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="white"/><path d="M16 8.5L9.5 15L6 11.5" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
             <span className="text-[14px] font-medium tracking-wide">Follow creators you love</span>
          </div>
          <div className="flex items-center gap-x-3 text-white">
             <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="white"/><path d="M16 8.5L9.5 15L6 11.5" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
             <span className="text-[14px] font-medium tracking-wide">Comment & interact</span>
          </div>
          <div className="flex items-center gap-x-3 text-white">
             <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="white"/><path d="M16 8.5L9.5 15L6 11.5" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
             <span className="text-[14px] font-medium tracking-wide">Personalized recommendations</span>
          </div>
        </div>

        <button type="button" aria-label="button" 
          onClick={() => navigate('/auth')}
          className="w-full max-w-[280px] bg-[#ef2950] hover:bg-[#ff3b61] text-white font-bold font-sans text-[15px] py-[15px] rounded-[14px] transition-transform active:scale-[0.98] mb-6 shadow-sm tracking-wide"
        >
          Join Getnayi
        </button>

        <button type="button" aria-label="button" 
          onClick={handleClose}
          className="text-[14px] font-sans font-medium text-white/80 hover:text-white transition-colors tracking-wide"
        >
          Maybe later
        </button>

      </motion.div>
    </div>
  );
}

