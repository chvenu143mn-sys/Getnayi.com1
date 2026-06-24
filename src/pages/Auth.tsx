import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import DOMPurify from 'dompurify';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setSuccess('Password reset link sent to your email.');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !showForgotPassword && !acceptedTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to register.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (showForgotPassword) {
        await handleResetPassword(e);
        return;
      }
      
      if (isLogin) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to log in');

        if (result.session) {
          const { error } = await supabase.auth.setSession({
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token,
          });
          if (error) throw error;
        } else {
          throw new Error('Authentication failed: no session returned');
        }
      } else {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            username: DOMPurify.sanitize(username.trim())
          })
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to sign up');
        
        const { data } = result;
        
        if (data.user && (!data.session || data.session === null)) {
          setSuccess('Success! Please check your email for a confirmation link.');
        }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="relative flex items-center justify-center min-h-[calc(100dvh-60px)] bg-[#0c0c0e] overflow-hidden pb-8">
      
      {/* Background Image full screen */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1515347619362-e61e6878b193?auto=format&fit=crop&w=800&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-black/70" />
      </div>

      {/* Back button */}
      <button type="button"
        onClick={() => (window.history.state && window.history.state.idx > 0) ? navigate(-1) : navigate('/', { replace: true })}
        className="absolute top-4 left-4 z-20 size-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 text-white active:scale-95 transition-all"
        aria-label="Go back"
      >
        <ArrowLeft className="size-5" />
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] z-10 relative px-6 pb-12 pt-20"
      >
        <div className="text-center mb-[44px]">
          <motion.h2 
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-[17px] font-sans font-semibold tracking-wide text-white mb-1"
          >
            Welcome to
          </motion.h2>
          <motion.h1 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-[44px] tracking-tight text-white mb-5 font-sans relative inline-flex items-end font-semibold"
          >
            Getnayi
            <div className="size-[7px] rounded-full bg-[#d9183b] shrink-0 mb-[9px] -ml-[2px]" />
          </motion.h1>
          <motion.p 
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-[15px] font-sans text-white/90 leading-relaxed font-medium tracking-wide"
          >
            Discover real products<br/>through real creators.
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {!showEmailForm ? (
            <motion.div 
              key="auth-buttons"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col gap-y-4 w-full"
            >
              <button aria-label="button"  
                type="button" 
                className="w-full py-[15px] px-4 flex justify-center items-center bg-white text-black font-bold font-sans rounded-[14px] hover:bg-zinc-100 transition-all active:scale-[0.98] text-[15px] gap-x-3 shadow-sm"
              >
                <svg className="size-[18px]" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                <span>Continue with Google</span>
              </button>

              <button aria-label="button"  
                type="button" 
                className="w-full py-[15px] px-4 flex justify-center items-center bg-white text-black font-bold font-sans rounded-[14px] hover:bg-zinc-100 transition-all active:scale-[0.98] text-[15px] gap-x-3 shadow-sm"
              >
                <svg className="size-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.63-.51 3.2-1.44 4.51-1.14 1.6-2.9 2.65-4.8 2.97-1.85.31-3.79-.11-5.32-1.12-1.64-1.09-2.73-2.91-2.92-4.88-.19-1.92.2-3.86 1.17-5.54 1.05-1.82 2.87-3.05 4.88-3.37v4.06c-1.02.13-1.96.65-2.61 1.48-.65.83-.87 1.95-.57 2.98.29 1.01 1.05 1.83 1.99 2.19.95.37 2.05.27 2.91-.25.84-.52 1.34-1.42 1.39-2.39V0h3.51z"/></svg>
                <span>Continue with TikTok</span>
              </button>

              <button aria-label="button"  
                type="button" 
                onClick={() => setShowEmailForm(true)}
                className="w-full py-[15px] px-4 flex justify-center items-center bg-transparent border border-white/20 text-white font-bold font-sans rounded-[14px] hover:bg-white/10 transition-all active:scale-[0.98] text-[15px] gap-x-3 backdrop-blur-md"
              >
                <Mail className="size-[18px] text-white" />
                <span>Continue with Email</span>
              </button>
            </motion.div>
          ) : (
            <motion.form 
              key="auth-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleAuth} 
              className="flex flex-col gap-y-3 w-full"
            >
              {!isLogin && !showForgotPassword && (
                <div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all font-sans text-[15px] backdrop-blur-sm"
                    placeholder="Choose a username"
                  />
                </div>
              )}
              
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all font-sans text-[15px] backdrop-blur-sm"
                  placeholder="Email address"
                />
              </div>

              {!showForgotPassword && (
                <div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all font-sans text-[15px] backdrop-blur-sm"
                    placeholder="Password"
                  />
                </div>
              )}

              {!isLogin && !showForgotPassword && (
                <div className="flex items-start gap-x-2.5 mt-1 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <input
                    type="checkbox"
                    id="agree-terms"
                    required
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 size-4 rounded bg-black/30 border-white/20 text-[#d9183b] focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
                  />
                  <label htmlFor="agree-terms" className="text-[11px] text-zinc-400 leading-normal select-none cursor-pointer">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate('/terms');
                      }}
                      className="text-white hover:underline font-semibold inline"
                    >
                      Terms of Service
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate('/privacy');
                      }}
                      className="text-white hover:underline font-semibold inline"
                    >
                      Privacy Policy
                    </button>
                    .
                  </label>
                </div>
              )}

              {error && (
                <div className="text-[13px] text-red-300 font-sans p-3 bg-red-500/20 rounded-xl border border-red-500/30 text-center backdrop-blur-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-[13px] text-white font-sans p-3 bg-white/20 rounded-xl border border-white/30 text-center backdrop-blur-sm">
                  {success}
                </div>
              )}

              <div className="pt-2 flex flex-col gap-y-3">
                <button aria-label="button" 
                type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 flex justify-center items-center bg-white text-black font-semibold font-sans rounded-full hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-[15px]"
                >
                  {isLoading ? 'Wait...' : (showForgotPassword ? 'Reset Password' : (isLogin ? 'Log In' : 'Sign Up'))}
                </button>
                {isLogin && !showForgotPassword && (
                  <button aria-label="button" 
                type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-white/70 text-[13px] font-medium hover:text-white mt-1"
                  >
                    Forgot Password?
                  </button>
                )}
                {showForgotPassword && (
                  <button aria-label="button" 
                type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-white/70 text-[13px] font-medium hover:text-white mt-1"
                  >
                    Back to Login
                  </button>
                )}
                {!showForgotPassword && (
                  <button aria-label="button" 
                type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="text-white/70 text-[13px] font-medium hover:text-white"
                  >
                    Back
                  </button>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {!showEmailForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-[14px] font-sans text-white/90 font-medium tracking-wide">
               {isLogin ? "Don't have an account?" : "Already have an account?"}
               <button type="button" aria-label="button" 
                 onClick={() => {
                   setIsLogin(!isLogin);
                   setShowEmailForm(true); // Jump straight to form if they click this
                   setError(null);
                   setSuccess(null);                 
                 }}
                 className="text-[#d9183b] ml-1.5 font-bold hover:text-[#f4284d] transition-colors"
               >
                 {isLogin ? "Sign up" : "Log in"}
               </button>
            </p>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}
