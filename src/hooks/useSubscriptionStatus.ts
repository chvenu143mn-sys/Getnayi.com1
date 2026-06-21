import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type SubscriptionPlan = 'free' | 'pro' | 'creator';
export type SubscriptionStatus = 'active' | 'trialing' | 'cancelled' | 'free' | 'past_due' | 'unpaid' | 'unknown';

export interface SubscriptionState {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  loading: boolean;
  isPremium: boolean;
  isCreator: boolean;
}

export function useSubscriptionStatus(): SubscriptionState {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    plan: 'free',
    status: 'free',
    loading: true,
    isPremium: false,
    isCreator: false,
  });

  useEffect(() => {
    let mounted = true;

    if (!user) {
      if (mounted) {
        setState({
          plan: 'free',
          status: 'free',
          loading: false,
          isPremium: false,
          isCreator: false,
        });
      }
      return;
    }

    const updateStateFromData = (data: any) => {
      const dbPlan = (data.subscription_plan as SubscriptionPlan) || 'free';
      const dbStatus = (data.subscription_status as SubscriptionStatus) || 'free';
      
      const isActive = dbStatus === 'active' || dbStatus === 'trialing';
      const effectivePlan = isActive ? dbPlan : 'free';
      const effectiveStatus = isActive ? dbStatus : 'free';

      setState({
        plan: effectivePlan,
        status: effectiveStatus,
        loading: false,
        isPremium: effectivePlan === 'pro' || effectivePlan === 'creator',
        isCreator: effectivePlan === 'creator',
      });
    };

    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_status')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (mounted && data) {
          updateStateFromData(data);
        }
      } catch (err) {
        console.error('Error fetching subscription status:', err);
        if (mounted) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    fetchStatus();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`profile_subscription_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (!mounted) return;
          console.log('Real-time subscription update:', payload.new);
          updateStateFromData(payload.new);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return state;
}
