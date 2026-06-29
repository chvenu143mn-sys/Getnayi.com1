import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ChevronLeft, Shield, Check, CreditCard, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

export default function SubscriptionSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { plan, status, loading } = useSubscriptionStatus();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);

  const handleCancelClick = () => setIsCancelModalOpen(true);

  const performCancel = async () => {
    if (!user) return;
    setCanceling(true);
    // In a real app we would call a backend endpoint to cancel the Razorpay subscription.
    // For now we will update the profile to set subscription_status to 'cancelled' and log reason.
    try {
      const { error } = await supabase.from('profiles').update({
        subscription_status: 'cancelled',
        subscription_plan: 'free'
      }).eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Your subscription has been cancelled.');
      setIsCancelModalOpen(false);
    } catch(err: any) {
      toast.error('Failed to cancel subscription.');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
     return <div className="min-h-screen bg-bg-base flex items-center justify-center">
       <div className="w-8 h-8 rounded-full border-t-2 border-brand-primary animate-spin" />
     </div>
  }

  const planName = plan === 'free' ? 'Free Plan' : plan === 'pro' ? 'Pro Plan' : 'Creator Plan';
  const planColor = plan === 'free' ? 'text-text-secondary' : 'text-brand-primary';

  return (
    <div className="min-h-screen bg-bg-base text-text-primary selection:bg-white/20 pb-32">
      <header className="sticky top-0 z-20 flex items-center px-4 py-4 bg-bg-base/80 backdrop-blur-md border-b border-border-subtle">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-surface-1 transition">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="ml-2 text-lg font-bold tracking-wide">Subscription</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 pt-6 space-y-6">
        
        {/* Current Plan Card */}
        <section className="bg-surface-2 border border-border-subtle rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-text-secondary font-medium mb-1">Current Plan</p>
              <h2 className={`text-2xl font-bold ${planColor} flex items-center gap-2`}>
                {planName}
                {plan !== 'free' && <Shield className="w-5 h-5" />}
              </h2>
              {plan !== 'free' && (
                <p className="mt-2 text-sm text-text-primary">
                  Status: <span className="capitalize text-green-400 font-medium">{status}</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-border-subtle space-y-4">
             {plan === 'free' ? (
               <button onClick={() => navigate('/subscription')} className="w-full py-3.5 bg-brand-primary hover:bg-[#f4284d] text-text-primary rounded-xl font-bold tracking-wide transition shadow-lg shadow-brand-primary/20">
                 Upgrade Plan
               </button>
             ) : (
               <div className="flex flex-col gap-3">
                 <button onClick={() => navigate('/subscription')} className="w-full py-3.5 bg-white/5 border border-border-subtle hover:bg-surface-1 text-text-primary rounded-xl font-bold tracking-wide transition">
                   Change Plan
                 </button>
                 <button onClick={handleCancelClick} className="w-full py-3.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-xl font-medium tracking-wide transition">
                   Cancel Subscription
                 </button>
               </div>
             )}
          </div>
        </section>

        {/* Billing History Placeholder */}
        <section className="bg-surface-2 border border-border-subtle rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-5 h-5 text-text-secondary" />
            <h3 className="text-lg font-bold">Billing History</h3>
          </div>
          <div className="text-center py-8">
            <p className="text-text-secondary text-sm">You have no past invoices.</p>
          </div>
        </section>

      </div>

      {/* Cancellation Modal */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-surface-2 border border-border-subtle rounded-2xl shadow-2xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-500/10 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <button onClick={() => setIsCancelModalOpen(false)} className="p-2 rounded-full hover:bg-surface-1">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
              
              <h3 className="text-xl font-bold mb-2">Cancel Subscription?</h3>
              <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                You will lose access to premium features at the end of your billing cycle. We'd love to know why you're leaving.
              </p>

              <div className="space-y-3 mb-8">
                {['It is too expensive', 'I am not using the features', 'Missing features I need', 'Technical issues', 'Other'].map(r => (
                  <button 
                    key={r}
                    onClick={() => setCancelReason(r)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${cancelReason === r ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-border-subtle hover:border-white/20 text-text-primary'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={performCancel}
                  disabled={canceling || !cancelReason}
                  className="w-full py-3.5 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {canceling ? 'Canceling...' : 'Confirm Cancellation'}
                </button>
                <button 
                  onClick={() => setIsCancelModalOpen(false)}
                  className="w-full py-3.5 text-text-primary hover:bg-surface-1 rounded-xl font-medium transition"
                >
                  Keep My Plan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
