import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSubscriptions() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('subscription_plan', ['pro', 'creator'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOverrideStatus = async (id: string, newStatus: string) => {
     try {
       const { error } = await supabase.from('profiles').update({ subscription_status: newStatus }).eq('id', id);
       if (error) throw error;
       toast.success(`Updated status to ${newStatus}`);
       fetchSubscriptions();
     } catch (err) {
       toast.error('Update failed');
     }
  };

  const filtered = profiles.filter(p => 
    (p.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.subscription_plan || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-xl font-bold text-white">Subscription Management</h2>
         <button onClick={fetchSubscriptions} className="p-2 bg-[#2c2c2e] hover:bg-[#3c3c3e] rounded-lg transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
         </button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-3 gap-4">
         <div className="bg-[#1c1c1e] border border-white/5 p-4 rounded-xl">
           <p className="text-sm text-zinc-400 mb-1">Total Active Paid</p>
           <p className="text-2xl font-bold text-white">{profiles.filter(p => p.subscription_status === 'active').length}</p>
         </div>
         <div className="bg-[#1c1c1e] border border-white/5 p-4 rounded-xl">
           <p className="text-sm text-zinc-400 mb-1">Pro Users</p>
           <p className="text-2xl font-bold text-white">{profiles.filter(p => p.subscription_plan === 'pro').length}</p>
         </div>
         <div className="bg-[#1c1c1e] border border-white/5 p-4 rounded-xl">
           <p className="text-sm text-zinc-400 mb-1">Creator Users</p>
           <p className="text-2xl font-bold text-white">{profiles.filter(p => p.subscription_plan === 'creator').length}</p>
         </div>
      </div>

      <div className="bg-[#1c1c1e] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#d9183b]"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="text-xs uppercase bg-black/20 text-zinc-500">
              <tr>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Payment ID</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-zinc-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-zinc-500">No subscriptions found</td></tr>
              ) : (
                filtered.map(profile => (
                  <tr key={profile.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-serif italic text-white/50">{profile.username?.[0] || 'U'}</div>
                        )}
                        <div>
                          <p className="text-white font-medium">{profile.username || 'Unknown'}</p>
                          <p className="text-xs">{profile.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${profile.subscription_plan === 'creator' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-400'}`}>
                         {profile.subscription_plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${profile.subscription_status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                         {profile.subscription_status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs opacity-70">
                      {profile.razorpay_subscription_id || '-'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                       {profile.subscription_status === 'active' ? (
                         <button onClick={() => handleOverrideStatus(profile.id, 'cancelled')} className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded text-xs transition">Cancel</button>
                       ) : (
                         <button onClick={() => handleOverrideStatus(profile.id, 'active')} className="px-3 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded text-xs transition">Activate</button>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
