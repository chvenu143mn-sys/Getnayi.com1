import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, User, Building, FileText, Globe, Link as LinkIcon, Check, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface CreatorVerificationFlowProps {
  approvalStatus: 'loading' | 'unauthorized' | 'pending' | 'rejected' | 'approved';
  setApprovalStatus: React.Dispatch<React.SetStateAction<'loading' | 'unauthorized' | 'pending' | 'rejected' | 'approved'>>;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function CreatorVerificationFlow({ approvalStatus, setApprovalStatus }: CreatorVerificationFlowProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [onboardingType, setOnboardingType] = useState<'creator' | 'brand'>('creator');
  const [showForm, setShowForm] = useState(false);
  const [appPortfolioUrl, setAppPortfolioUrl] = useState('');
  const [appSocialUrl, setAppSocialUrl] = useState('');
  const [appNotes, setAppNotes] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmittingApp(true);
    setError(null);
    try {
      const finalNotes = onboardingType === 'brand'
        ? `Role: Brand\n\nNotes:\n${appNotes}`
        : `Role: Creator\n\nNotes:\n${appNotes}`;

      const { data, error: err } = await supabase
        .from('creator_applications')
        .insert({
           user_id: user.id,
           portfolio_url: appPortfolioUrl,
           social_url: appSocialUrl,
           notes: finalNotes,
           status: 'pending'
        })
        .select()
        .single();
        
      if (err) throw err;
      setApprovalStatus('pending');
    } catch (err: any) {
       setError(err.message || 'Failed to submit application.');
    } finally {
       setIsSubmittingApp(false);
    }
  };

  if (approvalStatus === 'loading') {
    return (
      <div className="flex-1 w-full bg-[#0c0c0e] text-white pt-safe flex flex-col h-full font-sans">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col px-6 pb-8">
          <header className="flex items-center justify-between py-6 sticky top-0 bg-[#0c0c0e] z-15">
            <button type="button" aria-label="button" className="text-zinc-500 p-1 cursor-not-allowed" disabled>
              <ArrowLeft className="size-6" strokeWidth={2.5} />
            </button>
            <h1 className="text-[17px] font-semibold tracking-wide text-zinc-400 text-center flex-1 pr-6">
              Checking status...
            </h1>
          </header>

          <div className="flex-1 flex flex-col">
            <div className="w-full flex items-center justify-between max-w-[280px] mx-auto mt-2 mb-10 relative px-2">
              <div className="absolute top-[18px] left-[30px] right-[30px] h-[1px] bg-zinc-800 -z-5" />
              
              <div className="flex flex-col items-center gap-2 animate-pulse">
                <div className="size-[36px] rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-[14px] text-zinc-600">
                  1
                </div>
                <span className="text-[12px] font-medium tracking-wide text-zinc-500">Apply</span>
              </div>

              <div className="flex flex-col items-center gap-2 animate-pulse delay-75">
                <div className="size-[36px] rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-[14px] text-zinc-600">
                  2
                </div>
                <span className="text-[12px] font-medium tracking-wide text-zinc-500">Review</span>
              </div>

              <div className="flex flex-col items-center gap-2 animate-pulse delay-150">
                <div className="size-[36px] rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-[14px] text-zinc-600">
                  3
                </div>
                <span className="text-[12px] font-medium text-zinc-500 tracking-wide">Verified</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center text-center">
              <div className="size-24 rounded-full bg-[#1c1c1e] border-2 border-zinc-800/80 mb-6 flex items-center justify-center shadow-lg animate-pulse">
                <div className="size-12 rounded-full bg-zinc-800/50" />
              </div>

              <div className="w-48 h-6 bg-zinc-900 rounded-md animate-pulse mb-3" />
              <div className="w-64 h-4 bg-zinc-900 rounded-md animate-pulse mb-8" />

              <div className="w-full bg-[#111113] border border-zinc-800/80 rounded-[20px] p-5 flex flex-col gap-5 text-left shadow-md animate-pulse">
                {[
                  "w-1/2",
                  "w-2/3",
                  "w-5/12",
                  "w-3/4"
                ].map((widthClass, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="size-[18px] rounded-full bg-zinc-900 border border-zinc-800/60 shrink-0" />
                    <div className={cn("h-3.5 bg-zinc-800/40 rounded-md", widthClass)} />
                  </div>
                ))}
              </div>

              <div className="w-full h-[54px] bg-zinc-900 border border-zinc-800/50 rounded-2.5xl animate-pulse mt-10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white pt-safe flex flex-col h-full font-sans">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col px-6 pb-8">
        <header className="flex items-center justify-between py-6 sticky top-0 bg-[#0c0c0e] z-15">
          <button type="button" aria-label="button"  
            onClick={() => {
              if (showForm) {
                setShowForm(false);
              } else {
                navigate('/subscription');
              }
            }} 
            className="text-white hover:text-zinc-300 transition-colors p-1"
          >
            <ArrowLeft className="size-6" strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-wide text-white text-center flex-1 pr-6">
            {onboardingType === 'creator' ? "Creator Verification" : "Brand Verification"}
          </h1>
        </header>

        <div className="flex-1 flex flex-col">
          {approvalStatus === 'pending' || true ? (
            <div className="w-full flex items-center justify-between max-w-[280px] mx-auto mt-2 mb-10 relative px-2">
              <div className="absolute top-[18px] left-[30px] right-[30px] h-[1px] bg-zinc-800 -z-5" />
              
              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  "size-[36px] rounded-full flex items-center justify-center font-bold text-[14px] transition-all duration-300",
                  (approvalStatus === 'unauthorized' || approvalStatus === 'rejected' || approvalStatus === 'pending')
                    ? "bg-[#ef2950] text-white shadow-[0_0_15px_rgba(239,41,80,0.4)]"
                    : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                )}>
                  1
                </div>
                <span className={cn(
                  "text-[12px] font-medium tracking-wide",
                  (approvalStatus === 'unauthorized' || approvalStatus === 'rejected') ? "text-white" : "text-zinc-500"
                )}>
                  Apply
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  "size-[36px] rounded-full flex items-center justify-center font-bold text-[14px] transition-all duration-300",
                  approvalStatus === 'pending'
                    ? "bg-[#ef2950] text-white shadow-[0_0_15px_rgba(239,41,80,0.4)]"
                    : "bg-[#161618] text-zinc-500 border border-zinc-800"
                )}>
                  2
                </div>
                <span className={cn(
                  "text-[12px] font-medium tracking-wide",
                  approvalStatus === 'pending' ? "text-white" : "text-zinc-500"
                )}>
                  Review
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="size-[36px] rounded-full bg-[#161618] text-zinc-500 font-bold text-[14px] flex items-center justify-center border border-zinc-800">
                  3
                </div>
                <span className="text-[12px] font-medium text-zinc-500 tracking-wide">
                  Verified
                </span>
              </div>
            </div>
          ) : null}

          {approvalStatus === 'pending' ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6">
              <div className="size-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20 shadow-lg shadow-amber-500/5">
                <Loader2 className="size-8 animate-spin" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-white">Application Under Review</h3>
              <p className="text-zinc-400 text-[13.5px] leading-relaxed text-center max-w-xs px-2">
                Our moderators are currently reviewing your submitted onboarding details. We will automatically activate your posting access as soon as your application is approved! You'll receive a confirmation email and in-app notification the moment you're ready to go.
              </p>
              <button type="button" aria-label="button"  
                onClick={() => navigate('/')} 
                className="mt-8 px-6 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800/80 transition-all"
              >
                Return to Feed
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                {!showForm && (
                  <div className="flex bg-[#161618] p-1 rounded-xl border border-zinc-800 mb-8 max-w-[280px] mx-auto">
                    <button aria-label="button" 
                      type="button"
                      onClick={() => {
                        setOnboardingType('creator');
                        setError(null);
                      }}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-300",
                        onboardingType === 'creator'
                          ? "bg-[#ef2950] text-white shadow-md shadow-[#ef2950]/15"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <User className="size-3.5" />
                      Creator
                    </button>
                    <button aria-label="button" 
                      type="button"
                      onClick={() => {
                        setOnboardingType('brand');
                        setError(null);
                      }}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-300",
                        onboardingType === 'brand'
                          ? "bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/15"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <Building className="size-3.5" />
                      Brand
                    </button>
                  </div>
                )}

                {!showForm ? (
                  <div className="flex flex-col items-center text-center">
                    
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-[#f97316]/10 blur-2xl rounded-full" />
                      <svg className="size-24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M50 5C53.8 11.2 59.5 12.3 65.5 10.1C71.5 7.9 76.5 11.4 78 17.5C79.4 23.6 84.7 26.5 88.3 31.4C91.9 36.3 90.2 42.1 91 48.2C91.8 54.3 94.4 59.5 92.5 65.3C90.6 71.1 86 73.9 83 79.2C80 84.5 77.2 90.5 71.3 92.4C65.4 94.3 60.5 90.7 54.4 91.5C48.3 92.3 43.1 96.9 37.1 95C31.1 93.1 27.2 88.5 22 85C16.8 81.5 10.4 80.5 8 74.6C5.6 68.7 8.3 62.9 7 56.8C5.7 50.7 2.1 45.4 3.5 39.4C4.9 33.4 9.9 30.6 12 24.8C14.1 19 12.7 12.4 18.2 9.5C23.7 6.6 29.5 9.5 35.5 7.5C41.5 5.5 46.2-1.2 50 5Z" fill="url(#goldGrad)" className="drop-shadow-lg" />
                        <circle cx="50" cy="50" r="28" fill="#121214" stroke="url(#goldInner)" strokeWidth="1.5" />
                        
                        <path d="M50 34C45.5 34 42 37.5 42 42V46.5C39.5 46.5 38 48 38 50.5V61.5C38 64 39.5 65.5 42 65.5H58C60.5 65.5 62 64 62 61.5V50.5C62 48 60.5 46.5 58 46.5V42C58 37.5 54.5 34 50 34ZM45.5 42C45.5 39.5 47.5 37.5 50 37.5C52.5 37.5 54.5 39.5 54.5 42V46.5H45.5V42ZM50 52C51.4 52 52.5 53.1 52.5 54.5C52.5 55.5 51.9 56.4 51 56.8V61.5H49V56.8C48.1 56.4 47.5 55.5 47.5 54.5C47.5 53.1 48.6 52 50 52Z" fill="url(#redGrad)" />
                        
                        <defs>
                          <radialGradient id="goldGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#fca5a5" />
                            <stop offset="25%" stopColor="#f97316" />
                            <stop offset="70%" stopColor="#ea580c" />
                            <stop offset="100%" stopColor="#c2410c" />
                          </radialGradient>
                          <linearGradient id="goldInner" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#fed7aa" />
                            <stop offset="100%" stopColor="#ea580c" />
                          </linearGradient>
                          <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef2950" />
                            <stop offset="100%" stopColor="#b91c1c" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <h3 className="text-[20px] font-bold text-white tracking-wide mb-2.5">
                      Build trust. Get verified.
                    </h3>
                    <p className="text-[14px] text-zinc-400 tracking-wide leading-relaxed max-w-[280px] mb-8">
                      {onboardingType === 'creator'
                        ? "Verification helps your audience trust your recommendations."
                        : "Establish official authority as a validated Shopify brand store."}
                    </p>

                    <div className="w-full bg-[#111113] border border-zinc-800/80 rounded-[20px] p-5 flex flex-col gap-4 text-left shadow-md">
                      {[
                        onboardingType === 'creator' ? 'Verify your identity' : 'Establish store authority',
                        onboardingType === 'creator' ? 'Link social accounts' : 'Connect catalog endpoints',
                        onboardingType === 'creator' ? 'Show real presence' : 'Get verified badge badge-check',
                        'Agree to guidelines'
                      ].map((text, i) => (
                        <div key={i} className="flex items-center gap-3.5">
                          <div className="size-[18px] rounded-full bg-[#ef2950]/15 border border-[#ef2950]/30 flex items-center justify-center shrink-0">
                            <svg className="size-2.5 text-[#ef2950]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-[14px] font-medium text-zinc-200 tracking-wide">{text}</span>
                        </div>
                      ))}
                    </div>

                    <button type="button" aria-label="button"  
                      onClick={() => setShowForm(true)}
                      className="w-full mt-10 py-[17px] bg-[#ef2950] text-white font-semibold text-[15px] tracking-wide rounded-2.5xl flex items-center justify-center hover:bg-[#d61e40] transition-all duration-300 shadow-lg shadow-[#ef2950]/20 active:scale-[0.98]"
                    >
                      Start Verification
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitApplication} className="gap-y-5 animate-fadeIn pb-10">
                    <div className="mb-4">
                      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-widest font-bold">Step 1 — Submit Profile Links</p>
                      <h2 className="text-lg font-bold text-zinc-100">
                        {onboardingType === 'creator' ? "Creator Details Form" : "Brand Profile Form"}
                      </h2>
                    </div>

                    <div className="gap-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 ml-1">
                        {onboardingType === 'creator' ? "Work Portfolio or Link" : "Official Brand Website / Catalog URL"}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <LinkIcon className="size-4 text-zinc-500" />
                        </div>
                        <input
                          type="url"
                          required
                          value={appPortfolioUrl}
                          onChange={(e) => setAppPortfolioUrl(e.target.value)}
                          placeholder={onboardingType === 'creator' ? "https://example.com/portfolio-or-social" : "https://brandstorefront.com"}
                          className="w-full bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-600 rounded-xl focus:ring-2 focus:ring-[#ef2950] focus:border-transparent py-3.5 pl-11 pr-4 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="gap-y-2 mt-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 ml-1">
                        {onboardingType === 'creator' ? "Social profile handle link (Optional)" : "Official Brand Social Channel link"}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Globe className="size-4 text-zinc-500" />
                        </div>
                        <input
                          type="url"
                          required={onboardingType === 'brand'}
                          value={appSocialUrl}
                          onChange={(e) => setAppSocialUrl(e.target.value)}
                          placeholder={onboardingType === 'creator' ? "https://instagram.com/username" : "https://instagram.com/brandname"}
                          className="w-full bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-600 rounded-xl focus:ring-2 focus:ring-[#ef2950] focus:border-transparent py-3.5 pl-11 pr-4 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="gap-y-2 mt-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 ml-1">
                        {onboardingType === 'creator' ? "Tell us about your style & vibe" : "Brand overview catalog details"}
                      </label>
                      <div className="relative">
                        <div className="absolute top-3.5 left-4 pointer-events-none">
                          <FileText className="size-4 text-zinc-500" />
                        </div>
                        <textarea
                          required
                          value={appNotes}
                          onChange={(e) => setAppNotes(e.target.value)}
                          placeholder={onboardingType === 'creator' ? "Tell us about yourself, your favorite product categories, or what inspires your try-on videos..." : "Introduce your brand catalog size, product categories, and goals for partnering with creators..."}
                          rows={4}
                          className="w-full bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-600 rounded-xl focus:ring-2 focus:ring-[#ef2950] focus:border-transparent py-3.5 pl-11 pr-4 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-medium mt-4">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-4 pt-6">
                      <button aria-label="button" 
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="flex-1 border border-zinc-800 text-zinc-300 font-semibold py-4 rounded-xl hover:bg-zinc-900 transition-all font-sans text-sm"
                      >
                        Back
                      </button>
                      <button aria-label="button" 
                        type="submit"
                        disabled={isSubmittingApp}
                        className="flex-1 bg-[#ef2950] hover:bg-[#d61e40] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#ef2950]/20 flex justify-center items-center text-sm"
                      >
                        {isSubmittingApp ? <Loader2 className="size-5 animate-spin" /> : 'Request Access'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
