import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a session to update password for
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('No active session found. Please try the reset link again.');
      }
    });

    // Handle hash fragment processing for password reset
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Supabase automatically handles the hash and creates a session
      console.log('Recovery session active');
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setSuccess('Password updated successfully! Redirecting...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-[#0c0c0e] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[340px] z-10 relative bg-[#151518] p-6 rounded-2xl border border-white/10"
      >
        <h2 className="text-xl font-bold text-white mb-4 text-center">Update Password</h2>
        
        <form onSubmit={handleUpdatePassword} className="gap-y-4 flex flex-col">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:border-white/30 transition-all font-sans text-[15px]"
            placeholder="New password"
          />

          {error && (
            <div className="text-[13px] text-red-300 p-3 bg-red-500/20 rounded-xl border border-red-500/30 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="text-[13px] text-zinc-100 p-3 bg-green-500/20 rounded-xl border border-green-500/30 text-center">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !!success}
            className="w-full py-3.5 px-4 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 text-[15px]"
          >
            {isLoading ? 'Updating...' : 'Set New Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
