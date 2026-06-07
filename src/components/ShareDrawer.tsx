import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Link as LinkIcon, Send, MessageCircle, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';

// We can use custom SVG icons for WhatsApp, Instagram, Telegram since Lucide might not have them perfectly styled for brands
const BrandIcons = {
  WhatsApp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  ),
  Instagram: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  Telegram: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )
};

interface ShareDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  text?: string;
}

export function ShareDrawer({ isOpen, onClose, url, title, text }: ShareDrawerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: title || 'Check out this video',
          text: text || undefined,
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

  const socialLinks = [
    {
      id: 'copy',
      name: 'Copy Link',
      icon: copied ? <Check className="size-6 text-white" /> : <Copy className="size-6 text-white" />,
      color: 'bg-zinc-800',
      action: handleCopyLink,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <BrandIcons.WhatsApp className="size-7 text-white" />,
      color: 'bg-[#25D366]',
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${title ? title + ' ' : ''}${url}`)}`, '_blank');
        onClose();
      },
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <BrandIcons.Instagram className="size-7 text-white" />,
      color: 'bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888]',
      action: () => {
        // Direct messages are hard to deep link with prefilled text, but we can open IG
        handleNativeShare(); // Usually IG preferred flow is through native
      },
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: <BrandIcons.Telegram className="size-7 text-white" />,
      color: 'bg-[#0088cc]',
      action: () => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title || '')}`, '_blank');
        onClose();
      },
    },
  ];

  // If native share exists, we can add it to the list as well or just fall back to instagram native
  // Since the user asked specifically for WhatsApp, Instagram, Telegram, Copy link we will stick to those

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/60 pointer-events-auto flex items-end justify-center"
          onClick={onClose}
        >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="bg-[#1c1c1e] w-full max-w-md rounded-t-[24px] flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.5)] overflow-hidden relative pb-safe"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pull Drawer Bar Accent */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 shrink-0" />

          {/* Header */}
          <div className="px-5 pb-4 pt-2 border-b border-white/5 flex items-center justify-between shrink-0">
            <h3 className="text-white font-sans font-bold text-[16px] tracking-wide text-center w-full">
              Share to
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-5 p-1.5 rounded-full bg-white/10 text-zinc-300 hover:text-white transition-colors"
            >
              <X className="size-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Share Options Grid */}
          <div className="px-5 py-8">
            <div className="grid grid-cols-4 gap-4">
              {socialLinks.map((item) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="flex flex-col items-center gap-2.5 group transition-transform active:scale-95"
                >
                  <div className={cn(
                    "size-[54px] rounded-full flex items-center justify-center shadow-lg transition-transform",
                    item.color
                  )}>
                    {item.icon}
                  </div>
                  <span className="text-zinc-300 text-[11px] font-medium font-sans tracking-wide">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
            
            {navigator.share && (
              <div className="mt-8 border-t border-white/10 pt-6">
                <button
                  onClick={handleNativeShare}
                  className="w-full bg-white/5 hover:bg-white/10 text-white py-3.5 rounded-xl font-semibold text-[14px] transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="size-4" />
                  More Options
                </button>
              </div>
            )}
          </div>
         </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
