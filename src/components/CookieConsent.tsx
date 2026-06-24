import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, Check, Sliders, Shield, Activity, Settings, ChevronDown, ChevronUp } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  personalization: boolean;
}

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    necessary: true,
    analytics: true,
    personalization: true,
  });

  useEffect(() => {
    // 1. SEO-Optimization check: Detect bots and crawlers silently to avoid layout noise
    const isBot = /bot|google|baidu|bing|msn|duckduckbot|teoma|slurp|crawler|spider|robot|crawling/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );

    if (isBot) {
      // Crawlers bypass cookie consent banner entirely to index high-value page content cleanly
      return;
    }

    // 2. Check if user already accepted/rejected cookie settings in localStorage
    const savedConsent = localStorage.getItem('getnayi_cookie_consent');
    if (!savedConsent) {
      // Delay presentation slightly for a premium non-blocking entrance
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const consentObj = { necessary: true, analytics: true, personalization: true };
    localStorage.setItem('getnayi_cookie_consent', JSON.stringify(consentObj));
    setIsVisible(false);
  };

  const handleAcceptNecessary = () => {
    const consentObj = { necessary: true, analytics: false, personalization: false };
    localStorage.setItem('getnayi_cookie_consent', JSON.stringify(consentObj));
    setIsVisible(false);
  };

  const handleSaveCustom = () => {
    localStorage.setItem('getnayi_cookie_consent', JSON.stringify(prefs));
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="cookie-consent-banner"
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md w-auto z-[9999] bg-[#121214]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl shadow-black/80 font-sans text-white text-sm"
        >
          {/* Header */}
          <div className="flex items-start gap-x-4">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
              <Cookie className="size-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-zinc-100 text-base tracking-tight flex items-center gap-x-2">
                Cookie Preferences
              </h3>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                We use cookies to elevate your shopping & discovery experience, analyze traffic, and personalize product recommendations.
              </p>
            </div>
          </div>

          {/* Granular Preferences (Toggles) */}
          <AnimatePresence>
            {showPreferences && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-4 space-y-3 pt-4 border-t border-white/5"
              >
                {/* Essential Cookies */}
                <div className="flex items-center justify-between bg-zinc-900/40 p-2.5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-x-3">
                    <Shield className="size-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">Strictly Necessary</div>
                      <div className="text-[10px] text-zinc-500">Required for authentication, security & essential features.</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono uppercase font-bold">Always Active</span>
                </div>

                {/* Performance & Analytics */}
                <div className="flex items-center justify-between bg-zinc-900/40 p-2.5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-x-3">
                    <Activity className="size-4 text-blue-400" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">Performance & Analytics</div>
                      <div className="text-[10px] text-zinc-500">Helps us understand viewer engagement & optimize video playbacks.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setPrefs(prev => ({ ...prev, analytics: !prev.analytics }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      prefs.analytics ? 'bg-blue-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        prefs.analytics ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Personalization */}
                <div className="flex items-center justify-between bg-zinc-900/40 p-2.5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-x-3">
                    <Settings className="size-4 text-purple-400" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">Personalization</div>
                      <div className="text-[10px] text-zinc-500">Saves your dark/light theme choices and custom creator feeds.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setPrefs(prev => ({ ...prev, personalization: !prev.personalization }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      prefs.personalization ? 'bg-blue-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        prefs.personalization ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls & Action Buttons */}
          <div className="flex flex-col gap-y-2 mt-5">
            <div className="flex items-center justify-between gap-x-3">
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-x-1.5 transition-colors"
              >
                <Sliders className="size-3.5" />
                {showPreferences ? 'Hide Settings' : 'Customize Options'}
                {showPreferences ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </button>
              
              <button
                onClick={handleAcceptNecessary}
                className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
              >
                Necessary Only
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-3 mt-1">
              {showPreferences ? (
                <button
                  onClick={handleSaveCustom}
                  className="col-span-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-medium text-xs transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-x-1.5"
                >
                  <Check className="size-4" /> Save Preferences
                </button>
              ) : (
                <>
                  <button
                    onClick={handleAcceptNecessary}
                    className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl font-medium text-xs transition-all border border-white/5"
                  >
                    Reject Optional
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="py-2.5 px-4 bg-white text-black hover:bg-zinc-200 active:bg-zinc-300 rounded-xl font-medium text-xs transition-all shadow-lg shadow-black/20"
                  >
                    Accept All
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
