import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ShareDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  videoTitle?: string;
  productName?: string;
  productPrice?: number | null;
  couponCode?: string;
  couponDiscountValue?: string;
  couponDiscountType?: string;
  thumbnailUrl?: string;
  creatorName?: string;
  categoryName?: string;
}

export function ShareDrawer({ 
  isOpen, 
  onClose, 
  url, 
  videoTitle,
  creatorName,
  productName,
  couponCode,
  couponDiscountValue,
  couponDiscountType
}: ShareDrawerProps) {
  const [copied, setCopied] = useState(false);

  const fallbackTitle = videoTitle || 'Check out this video';
  
  let shareText = creatorName 
    ? `${fallbackTitle} by @${creatorName} on Getnayi.`
    : `${fallbackTitle} on Getnayi.`;
    
  if (productName) {
    shareText += `\n\nFeaturing: ${productName}`;
  }
  
  if (couponCode && couponDiscountValue) {
    const symbol = couponDiscountType === 'percentage' ? '%' : '$';
    const amount = couponDiscountType === 'percentage' ? `${couponDiscountValue}%` : `$${couponDiscountValue}`;
    shareText += `\nUse code ${couponCode} for ${amount} off!`;
  }
  
  shareText += `\n\nWatch here: ${url}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: fallbackTitle,
          text: shareText,
          url: url,
        });
        onClose();
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Native share failed:', err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 flex items-end justify-center backdrop-blur-sm pointer-events-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[#1c1c1e] w-full max-w-md rounded-t-3xl flex flex-col shadow-2xl relative pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 mb-2 shrink-0" />

            <div className="px-6 py-4 flex justify-between items-center text-white border-b border-white/10 shrink-0">
              <div className="flex flex-col">
                <h3 className="font-bold text-lg">Share Content</h3>
                <p className="text-sm text-zinc-400">Share to other platforms or copy the link.</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              
              {/* Copy Link Section */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">Direct Video Link</span>
                <div className="flex flex-col sm:flex-row items-center bg-black/40 rounded-xl p-2 border border-white/5 relative gap-2 sm:gap-0">
                  <input 
                    type="text" 
                    readOnly 
                    value={url} 
                    className="w-full sm:flex-1 bg-transparent text-sm text-white/90 outline-none px-2 truncate cursor-text"
                  />
                  <button 
                    onClick={handleCopyLink}
                    className="w-full sm:w-auto ml-0 sm:ml-2 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium text-sm transition-all"
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check className="w-4 h-4 text-emerald-400" />
                        </motion.div>
                      ) : (
                        <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Copy className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Web Share API Native Share Button */}
              {navigator.share ? (
                <button
                  onClick={handleNativeShare}
                  className="w-full bg-white text-black p-4 rounded-xl font-bold text-sm transition-all hover:scale-[0.98] active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Share2 className="w-5 h-5" />
                  Share via...
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center flex flex-col items-center justify-center">
                  <Share2 className="w-6 h-6 text-zinc-500 mb-2" />
                  <p className="text-sm font-medium text-zinc-400">Your device doesn't support the native Web Share API.</p>
                  <p className="text-xs text-zinc-500 mt-1">Please use the copy link button above.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
