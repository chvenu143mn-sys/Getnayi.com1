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
  videoTitle?: string;
  productName?: string;
  productPrice?: number | null;
  couponCode?: string;
  thumbnailUrl?: string;
  creatorName?: string;
  categoryName?: string;
}

export function ShareDrawer({ 
  isOpen, 
  onClose, 
  url, 
  videoTitle, 
  productName, 
  productPrice, 
  couponCode, 
  thumbnailUrl, 
  creatorName,
  categoryName
}: ShareDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [cardGenerating, setCardGenerating] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const fallbackTitle = videoTitle || 'Check out this video';
  const nameStr = productName ? ` - ${productName}` : '';
  const priceStr = productPrice ? `. Guess the price! It's just ₹${String(productPrice).replace(/^\d/, 'x')} 🔥` : '';
  const couponStr = couponCode ? `. Coupon code: masked.` : '';
  
  // Strict standard sharing template
  const shareContentText = `${fallbackTitle}${nameStr}${priceStr}${couponStr}\n\nWatch here: \n${url}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareContentText);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleNativeShareText = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          text: shareContentText,
        });
        onClose();
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Native share failed:', err);
      }
    }
  };

  const generateAndShareCard = async () => {
    if (!cardRef.current || cardGenerating) return;
    setCardGenerating(true);
    try {
      // Dynamic import to keep bundle smaller on load
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null, // transparent
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], 'share-card.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            text: shareContentText,
          });
        } else {
          // Fallback to downloading
          const dataUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = 'getnayi-share.png';
          link.click();
          URL.revokeObjectURL(dataUrl);
        }
        
        setCardGenerating(false);
        onClose();
      }, 'image/png');
      
    } catch (err) {
      console.error('Failed to generate card', err);
      setCardGenerating(false);
    }
  };

  const socialLinks = [
    {
      id: 'copy',
      name: 'Copy Link',
      icon: (
        <AnimatePresence mode="popLayout">
          {copied ? (
            <motion.div key="check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
              <Check className="size-6 text-emerald-400" />
            </motion.div>
          ) : (
            <motion.div key="copy" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
              <Copy className="size-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      ),
      color: 'bg-zinc-800',
      action: handleCopyLink,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <BrandIcons.WhatsApp className="size-7 text-white" />,
      color: 'bg-[#25D366]',
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareContentText)}`, '_blank');
        onClose();
      },
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <BrandIcons.Instagram className="size-7 text-white" />,
      color: 'bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888]',
      action: () => {
        handleNativeShareText(); 
      },
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: <BrandIcons.Telegram className="size-7 text-white" />,
      color: 'bg-[#0088cc]',
      action: () => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareContentText)}`, '_blank');
        onClose();
      },
    },
  ];

  // Pick background based on category hash
  const getCategoryColor = (cat?: string) => {
    if (!cat) return 'from-rose-500 to-indigo-600';
    const hash = cat.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      'from-emerald-500 to-teal-700',
      'from-amber-500 to-orange-600',
      'from-blue-500 to-cyan-600',
      'from-rose-500 to-pink-700',
      'from-violet-500 to-fuchsia-600',
      'from-indigo-500 to-blue-700'
    ];
    return colors[hash % colors.length];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 pointer-events-auto flex items-end justify-center backdrop-blur-[2px]"
          onClick={onClose}
        >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="bg-[#1c1c1e] w-full max-w-md rounded-t-[24px] flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.5)] overflow-hidden relative pb-safe h-fit max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 shrink-0" />

          <div className="px-5 pb-4 pt-2 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-white text-[18px]">Share</h3>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto no-scrollbar pb-6 px-5 flex flex-col gap-6">
            
            {/* Visual Card Preview */}
            <div className="flex flex-col gap-2.5 items-center">
              <span className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider self-start pl-1">Card Preview</span>
              
              {/* THE CARD WE TURN INTO AN IMAGE */}
              <div 
                ref={cardRef} 
                className={cn(
                  "w-full aspect-[4/5] rounded-[24px] rounded-tl-[48px] rounded-br-[48px] overflow-hidden p-6 flex flex-col justify-between relative isolate",
                  "bg-gradient-to-br shadow-2xl",
                  getCategoryColor(categoryName)
                )}
              >
                {/* Overlay pattern/noise */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>

                {/* Top Section */}
                <div className="relative z-10 flex justify-between items-start">
                  {categoryName ? (
                     <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[11px] font-bold uppercase tracking-wider shadow-sm border border-white/20 inline-flex">
                       {categoryName}
                     </div>
                  ) : (
                     <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white/90 text-[10px] font-bold uppercase tracking-widest border border-white/10 inline-flex">
                       DISCOVERY
                     </div>
                  )}

                  <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 shadow-lg flex items-center justify-center">
                    <span className="text-white text-[13px] font-black tracking-widest font-sans">GETNAYI</span>
                  </div>
                </div>

                {/* Middle Section (Image if present) */}
                {thumbnailUrl && (
                  <div className="relative z-10 flex-1 my-6 rounded-[20px] rounded-tl-[36px] rounded-br-[36px] overflow-hidden shadow-2xl border-4 border-white/10 mx-auto w-full max-w-[280px]">
                    <img src={thumbnailUrl} className="w-full h-full object-cover" crossOrigin="anonymous" alt="Preview"/>
                    {productPrice && (
                      <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-2xl backdrop-saturate-150">
                         <span className="text-white/70 text-[10px] uppercase font-bold tracking-widest block mb-0.5">Price</span>
                         <span className="text-white text-[24px] font-black tracking-tight leading-none">₹{String(productPrice).replace(/^\d/, 'x')}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Bottom Section */}
                <div className="relative z-10 mt-auto bg-black/40 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-xl overflow-hidden">
                   {productName && (
                     <h2 className="text-white text-[22px] font-extrabold leading-tight mb-2 pr-4">{productName}</h2>
                   )}
                   <p className="text-white/80 text-[13.5px] leading-relaxed line-clamp-3 mb-4 font-medium">{fallbackTitle}</p>
                   {creatorName && (
                     <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                       <div className="size-6 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">@</span>
                       </div>
                       <span className="text-white text-[13px] font-bold tracking-wide">{creatorName}</span>
                     </div>
                   )}
                </div>
              </div>
              
              <button 
                onClick={generateAndShareCard}
                disabled={cardGenerating}
                className="w-full mt-3 py-3.5 bg-white/10 hover:bg-white/15 text-white/90 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {cardGenerating ? "Generating Card..." : "Share Visual Card"}
              </button>
            </div>
            
            {/* Standard Text Copying Box (Preview) */}
            <div className="flex flex-col gap-2 items-start mt-2">
              <span className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider pl-1">Message Preview</span>
              <div className="bg-black/30 w-full p-3.5 rounded-xl border border-white/5 text-[13px] text-zinc-300 leading-relaxed font-sans relative group">
                <p className="whitespace-pre-wrap font-medium">{shareContentText}</p>
                <button 
                  onClick={handleCopyLink}
                  className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors overflow-hidden flex items-center justify-center"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div key="check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                        <Check className="size-4 text-emerald-400" />
                      </motion.div>
                    ) : (
                      <motion.div key="copy" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                        <Copy className="size-4 text-zinc-400 hover:text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* Social Share Grid */}
            <div className="grid grid-cols-4 gap-4 mt-2">
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
              <button
                onClick={handleNativeShareText}
                className="w-full bg-white/5 hover:bg-white/10 text-white/90 py-3.5 rounded-xl font-semibold text-[14px] transition-colors flex items-center justify-center gap-2 active:scale-95 mt-2"
              >
                <Send className="size-4" />
                More Options
              </button>
            )}

          </div>
         </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
