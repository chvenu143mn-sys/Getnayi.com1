import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Zap, ShieldCheck, PlaySquare, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionPricingTable } from '../components/subscription/SubscriptionPricingTable';
import { SubscriptionFAQ } from '../components/subscription/SubscriptionFAQ';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import { safeFetch } from '../utils/apiClient';

import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Subscription() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { plan: currentPlan, loading: isFetchingPlan } = useSubscriptionStatus();
  
  useEffect(() => {
    // Only load Razorpay if needed later, to prevent random cross-origin script errors on load.
  }, []);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['var(--color-brand-primary)', '#ffffff', '#ffd700']
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['var(--color-brand-primary)', '#ffffff', '#ffd700']
      });
    }, 250);
  };

  const initiatePayment = async (planId: string) => {
    if (!user) {
      toast.info('Please sign in or create an account to start your subscription.');
      navigate('/auth', { state: { returnTo: '/subscription' } });
      return;
    }
    
    setLoading(true);
    const initToastId = toast.loading('Initiating secure checkout...');
    try {
      // 1. Create subscription on server
      let data: any;
      try {
        data = await safeFetch('/api/subscription/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ plan_id: planId }) 
        });
      } catch (err: any) {
        throw new Error(err.message || 'Failed to create subscription');
      }
      
      const orderId = data.order_id;
      
      toast.dismiss(initToastId);
      
      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        order_id: orderId,
        name: planId === import.meta.env.VITE_RAZORPAY_CREATOR_PLAN_ID || planId === 'plan_creator_yearly' ? 'GetNayi Creator' : 'GetNayi Pro',
        description: 'Premium Video Platform Access',
        image: '/icon-192.png',
        handler: async function (response: any) {
          const loadingToastId = toast.loading('Verifying payment...');
          try {
            const vData = await safeFetch('/api/subscription/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || ''}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: planId
              })
            });
            triggerConfetti();
            toast.success('Successfully upgraded to premium!', {
              id: loadingToastId,
              description: 'Your new benefits have been activated.',
              duration: 5000,
            });
            // Redirect to upload page after successful subscription to enjoy new logic
            setTimeout(() => navigate('/upload'), 3500);
          } catch(e: any) {
            toast.error(e.message || 'Verification failed', { id: loadingToastId });
          }
        },
        prefill: {
          name: (user as any).profile?.username || '',
          email: user.email || '',
        },
        theme: {
          color: 'var(--color-brand-primary)'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };
      
      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
        toast.error('Payment failed: ' + (response.error?.description || 'Something went wrong'));
        try {
          // Close the Razorpay checkout modal
          // @ts-ignore
          rzp1.close();
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
      });
      rzp1.open();
    } catch (err: any) {
      toast.dismiss(initToastId);
      toast.error(err.message || 'Payment initiation failed');
      setLoading(false);
    }
  };

  const handleSubscribePro = (isYearly: boolean) => initiatePayment(isYearly ? (import.meta.env.VITE_RAZORPAY_PRO_YEARLY_PLAN_ID || 'plan_pro_yearly') : (import.meta.env.VITE_RAZORPAY_PRO_MONTHLY_PLAN_ID || 'plan_pro_monthly'));
  const handleSubscribeCreator = (isYearly: boolean) => initiatePayment(isYearly ? (import.meta.env.VITE_RAZORPAY_CREATOR_YEARLY_PLAN_ID || 'plan_creator_yearly') : (import.meta.env.VITE_RAZORPAY_CREATOR_MONTHLY_PLAN_ID || 'plan_creator_monthly'));
  const handleSelectFree = () => navigate('/upload?onboarding=true');

  return (
    <div className="min-h-screen bg-bg-base text-text-primary selection:bg-brand-primary/30 py-20 px-4 pb-32">
      
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center mb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-sm font-semibold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Zap className="size-4" /> 
          Supercharge your reach
        </div>
        
        <h1 className="text-4xl md:text-brand-primaryxl font-extrabold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
          Turn videos into <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-orange-500">
            revenue streams
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          Upgrade your account to instantly remove upload limits, jump the manual verification queue, and get priority exposure on our Trending feeds.
        </p>
      </div>

      {/* Value Props */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10 mb-24 animate-in fade-in duration-1000 delay-200">
        <div className="flex flex-col items-center text-center">
          <div className="size-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-5 text-brand-primary border border-brand-primary/20">
            <ShieldCheck className="size-6" />
          </div>
          <h3 className="text-xl font-bold mb-3">Auto-Approval</h3>
          <p className="text-text-secondary">Skip the line. Pro creators get automatic approval for all video uploads, empowering you to post instantly.</p>
        </div>
        
        <div className="flex flex-col items-center text-center">
          <div className="size-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-5 text-brand-primary border border-brand-primary/20">
            <TrendingUp className="size-6" />
          </div>
          <h3 className="text-xl font-bold mb-3">Priority Exposure</h3>
          <p className="text-text-secondary">Get an algorithmic boost. Pro videos are prioritized in user feeds, significantly increasing organic discovery.</p>
        </div>
        
        <div className="flex flex-col items-center text-center">
          <div className="size-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-5 text-brand-primary border border-brand-primary/20">
            <PlaySquare className="size-6" />
          </div>
          <h3 className="text-xl font-bold mb-3">Unlimited Uploads</h3>
          <p className="text-text-secondary">No more rate limits. Post as many high-quality, shoppable videos as you want and grow your audience.</p>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="animate-in fade-in duration-1000 delay-300">
        <div className="text-center mb-12">
          <h2 className="text-brand-primaryxl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-text-secondary">Pick the plan that's right for your goals.</p>
        </div>
        
        <SubscriptionPricingTable 
          currentPlan={currentPlan} 
          onSubscribePro={handleSubscribePro}
          onSubscribeCreator={handleSubscribeCreator}
          onSelectFree={handleSelectFree}
          loading={loading}
          isFetching={isFetchingPlan}
        />
      </div>
      
      <SubscriptionFAQ />
      
      <div className="max-w-6xl mx-auto mt-16 text-center text-sm text-text-secondary flex flex-col items-center">
        <img src="/razorpay-logo.png" alt="Secured by Razorpay" className="h-6 opacity-40 mb-3 grayscale" onError={(e) => e.currentTarget.style.display='none'} loading="lazy" decoding="async" />
        <p>100% secure payment processing via Razorpay.</p>
        <p className="mt-1">Subscriptions renew automatically. Cancel anytime from your settings.</p>
      </div>
    </div>
  );
}
