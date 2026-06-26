import React from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface UploadAccordionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function UploadAccordion({ title, icon, isOpen, onToggle, children, className }: UploadAccordionProps) {
  return (
    <div className={cn("border border-zinc-900 bg-[#111113] rounded-2xl overflow-hidden", className)}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 outline-none active:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <span className="text-[15px] font-bold text-white tracking-wide">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="size-5 text-zinc-400 shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 gap-y-5 flex flex-col">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
