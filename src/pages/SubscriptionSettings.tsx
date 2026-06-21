import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ChevronLeft, Shield, Check, CreditCard, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
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
     return <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
       <div className="w-8 h-8 rounded-full border-t-2 border-[#ef2950] animate-spin" />
     </div>
  }

  const planName = plan === 'free' ? 'Free Plan' : plan === 'pro' ? 'Pro Plan' : 'Creator Plan';
  const planColor = plan === 'free' ? 'text-zinc-400' : 'text-[#ef2950]';

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white selection:bg-white/20 pb-32">
      <header className="sticky top-0 z-20 flex items-center px-4 py-4 bg-[#0c0c0e]/80 backdrop-blur-md border-b border-white/5">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="ml-2 text-lg font-bold tracking-wide">Subscription</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 pt-6 space-y-6">
        
        {/* Current Plan Card */}
        <section className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-400 font-medium mb-1">Current Plan</p>
              <h2 className={`text-2xl font-bold ${planColor} flex items-center gap-2`}>
                {planName}
                {plan !== 'free' && <Shield className="w-5 h-5" />}
              </h2>
              {plan !== 'free' && (
                <p className="mt-2 text-sm text-zinc-300">
                  Status: <span className="capitalize text-green-400 font-medium">{status}</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
             {plan === 'free' ? (
               <button onClick={() => navigate('/subscription')} className="w-full py-3.5 bg-[#ef2950] hover:bg-[#ff3b61] text-white rounded-xl font-bold tracking-wide transition shadow-lg shadow-[#ef2950]/20">
                 Upgrade Plan
               </button>
             ) : (
               <div className="flex flex-col gap-3">
                 <button onClick={() => navigate('/subscription')} className="w-full py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold tracking-wide transition">
                   Change Plan
                 </button>
                 <button onClick={handleCancelClick} className="w-full py-3.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl font-medium tracking-wide transition">
                   Cancel Subscription
                 </button>
               </div>
             )}
          </div>
        </section>

        {/* Billing History Placeholder */}
        <section className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-5 h-5 text-zinc-400" />
            <h3 className="text-lg font-bold">Billing History</h3>
          </div>
          <div className="text-center py-8">
            <p className="text-zinc-500 text-sm">You have no past invoices.</p>
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
              className="w-full max-w-md bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-500/10 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <button onClick={() => setIsCancelModalOpen(false)} className="p-2 rounded-full hover:bg-white/10">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              
              <h3 className="text-xl font-bold mb-2">Cancel Subscription?</h3>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                You will lose access to premium features at the end of your billing cycle. We'd love to know why you're leaving.
              </p>

              <div className="space-y-3 mb-8">
                {['It is too expensive', 'I am not using the features', 'Missing features I need', 'Technical issues', 'Other'].map(r => (
                  <button 
                    key={r}
                    onClick={() => setCancelReason(r)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${cancelReason === r ? 'border-[#ef2950] bg-[#ef2950]/10 text-[#ef2950]' : 'border-white/10 hover:border-white/20 text-zinc-300'}`}
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
                  className="w-full py-3.5 text-zinc-300 hover:bg-white/5 rounded-xl font-medium transition"
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
