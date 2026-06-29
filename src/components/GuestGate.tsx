import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Crown } from 'lucide-react';
import { cn } from '../lib/utils';
import { theme } from '../styles/theme';

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
    <div className={cn("fixed inset-0 z-[100] flex items-center justify-center overflow-hidden font-sans", type === 'action' ? cn(theme.colors.bgBase.replace('bg-bg-base', 'bg-bg-base/80'), 'backdrop-blur-xl') : theme.colors.bgBase)}>
      
      {/* Solid System Background */}
      {type !== 'action' && <div className={cn("absolute inset-0 z-0", theme.colors.bgBase)} />}

      {/* Back button (Matches Auth.tsx) */}
      <button type="button"
        onClick={handleClose}
        className={cn("absolute top-4 left-4 z-20 size-10 rounded-full backdrop-blur-md flex items-center justify-center border active:scale-95 transition-all shadow-sm hover:opacity-90", theme.colors.surface1, theme.colors.borderSubtle, theme.colors.textPrimary)}
        aria-label="Go back"
      >
        <ArrowLeft className="size-5" />
      </button>
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 flex flex-col w-full max-w-[360px] p-6 sm:p-8 items-center rounded-[32px] border border-transparent hover:border-brand-primary/10 transition-colors duration-500 relative"
      >
        <div className="text-center mb-[34px] flex flex-col items-center">
          <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ delay: 0.1, duration: 0.5 }}
             className={cn("mb-6 size-[56px] rounded-2xl flex items-center justify-center border backdrop-blur-md shrink-0 relative overflow-hidden box-border shadow-xl", theme.colors.surface1, theme.colors.borderSubtle)}
          >
            <div className={cn("absolute inset-0 opacity-20", theme.colors.brandPrimary)} />
            <Crown className={cn("size-7 drop-shadow-md z-10", theme.colors.textPrimary)} strokeWidth={1.5} />
          </motion.div>

          <motion.h1 
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={cn("mb-2 text-center", theme.typography.heading1, theme.colors.textPrimary)}
          >
            {title || "Elevate your"}
            {!title && <><br/>Getnayi experience</>}
          </motion.h1>

          {(description || !title) && (
             <motion.p 
               initial={{ y: 5, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.3, duration: 0.5 }}
               className={cn("mt-3.5 text-center max-w-[280px]", theme.typography.body, theme.colors.textSecondary)}
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
              <div key={i} className={cn("flex items-center gap-x-3.5", theme.colors.textPrimary)}>
                 <div className={cn("size-5 shrink-0 rounded-full flex items-center justify-center border backdrop-blur-sm", theme.colors.surface2, theme.colors.borderSubtle)}>
                   <svg className={cn("size-3", theme.colors.textPrimary)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                 </div>
                 <span className={cn(theme.typography.label)}>{text}</span>
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
            className={cn("w-full py-[15px] px-4 flex justify-center items-center font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg text-[15px] tracking-wide hover:opacity-90", theme.colors.brandPrimary, "text-bg-base")}
          >
             Join Getnayi
          </button>

          <button type="button" aria-label="button" 
            onClick={handleClose}
            className={cn("transition-colors mt-1 opacity-70 hover:opacity-100", theme.typography.label, theme.colors.textPrimary)}
          >
            Maybe later
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
}

