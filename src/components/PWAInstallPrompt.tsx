import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { safeStorage } from '../utils/storage';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isLocalStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                              (window.navigator as any).standalone === true;
    setIsStandalone(isLocalStandalone);

    if (isLocalStandalone) {
      return;
    }

    // Check if dismissed previously
    if (safeStorage.getItem('pwa_prompt_dismissed') === 'true') {
      setIsDismissed(true);
      return;
    }

    // Handle beforeinstallprompt for Android/Desktop Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

    if (isIOS && isSafari) {
      // Small delay before showing iOS prompt
      const timer = setTimeout(() => {
        setShowIOSPrompt(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const dismissPrompt = () => {
    setIsDismissed(true);
    setDeferredPrompt(null);
    setShowIOSPrompt(false);
    safeStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      {(deferredPrompt || showIOSPrompt) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-surface-1 border border-border-subtle rounded-2xl p-4 shadow-2xl z-50 overflow-hidden"
        >
          <button 
            type="button" 
            onClick={dismissPrompt}
            className="absolute top-2 right-2 p-1.5 bg-black/20 text-text-primary/60 hover:text-text-primary hover:bg-black/40 rounded-full transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 bg-white/10 p-3 rounded-xl flex items-center justify-center">
              {showIOSPrompt ? <Share className="w-6 h-6 text-blue-400" /> : <Download className="w-6 h-6 text-green-400" />}
            </div>
            <div className="flex-1 pb-1">
              <h3 className="font-semibold text-text-primary mb-1">Install App</h3>
              
              {showIOSPrompt ? (
                <p className="text-sm text-text-secondary">
                  Tap the <Share className="inline w-4 h-4 mx-1" /> Share button and select <br/>
                  <span className="font-medium text-text-primary flex items-center mt-2"><PlusSquare className="inline w-4 h-4 mr-1" /> Add to Home Screen</span>
                </p>
              ) : (
                <>
                  <p className="text-sm text-text-secondary mb-3">Install for a better, faster, and offline-ready experience.</p>
                  <button 
                    type="button"
                    onClick={handleInstallClick}
                    className="bg-white text-black font-semibold text-sm px-4 py-2 rounded-xl active:scale-95 transition-transform"
                  >
                    Install Now
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
