import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Playwright has injected a mock user to bypass Supabase loading lag
    // @ts-ignore
    if (window.__MOCK_USER__) {
      // @ts-ignore
      const mockUser = window.__MOCK_USER__;
      setUser(mockUser);
      setSession({
        access_token: 'mock-jwt-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: mockUser
      });
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        console.log('--- BROWSER GETSESSION CHECK STARTED');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
             console.warn('Refresh token not found or invalid. Normalizing session to null.');
             // Clear any stale local state
             await supabase.auth.signOut().catch(() => {});
          } else {
             console.warn('Auth getSession error:', error.message);
          }
        }
        
        console.log('--- BROWSER GETSESSION COMPLETED:', session);
        setSession(session);
        setUser(session?.user ?? null);
      } catch (err) {
        console.warn('Auth getSession exception:', err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = React.useMemo(() => ({ session, user, loading, signOut }), [session, user, loading, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
