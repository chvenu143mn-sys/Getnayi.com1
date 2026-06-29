import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { SEO } from './components/SEO';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CookieConsent } from './components/CookieConsent';
import { safeSession } from './utils/storage';

// Robust loader to retry dynamic imports and recover gracefully from network flakes or dev server restarts
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error('Error loading component dynamically:', error);
      // Wait 1.5s and retry once
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return await componentImport();
      } catch (retryError) {
        console.error('Retry loading component failed. Reloading page...', retryError);
        const storageKey = 'last-dynamic-import-error';
        const lastReload = safeSession.getItem(storageKey);
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
          safeSession.setItem(storageKey, String(now));
          window.location.reload();
        }
        throw retryError;
      }
    }
  });
}

// Lazy loaded pages for Code Splitting
const AuthPage = lazyWithRetry(() => import('./pages/Auth'));
const Feed = lazyWithRetry(() => import('./pages/Feed'));
const Upload = lazyWithRetry(() => import('./pages/Upload'));
const ProfilePage = lazyWithRetry(() => import('./pages/Profile'));
const Admin = lazyWithRetry(() => import('./pages/Admin'));
const Explore = lazyWithRetry(() => import('./pages/Explore'));
const Trending = lazyWithRetry(() => import('./pages/Trending'));
const Notifications = lazyWithRetry(() => import('./pages/Notifications'));
const Subscription = lazyWithRetry(() => import('./pages/Subscription'));
const SubscriptionSettings = lazyWithRetry(() => import('./pages/SubscriptionSettings'));
const Saved = lazyWithRetry(() => import('./pages/Saved'));
const Collection = lazyWithRetry(() => import('./pages/Collection'));
const SharedCollection = lazyWithRetry(() => import('./pages/SharedCollection'));
const CreatorVerification = lazyWithRetry(() => import('./pages/CreatorVerification'));
const CreatorDashboard = lazyWithRetry(() => import('./pages/CreatorDashboard'));
const StoreFeed = lazyWithRetry(() => import('./pages/StoreFeed'));
const CategoryFeed = lazyWithRetry(() => import('./pages/CategoryFeed'));
const ShortUrlRedirect = lazyWithRetry(() => import('./pages/ShortUrlRedirect'));
const UpdatePasswordPage = lazyWithRetry(() => import('./pages/UpdatePassword'));
const Interests = lazyWithRetry(() => import('./pages/Interests'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'));

import { theme } from './styles/theme';
import { cn } from './lib/utils';
import { isSupabaseConfigured } from './lib/supabase';
import { Database } from 'lucide-react';
import { Toaster } from 'sonner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className={cn("h-full relative flex flex-col font-sans", theme.colors.bgBase, theme.colors.textPrimary)}>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
           <div className="relative flex items-center justify-center size-12">
             <div className="size-5 border-2 border-brand-primary/20 border-t-[var(--color-brand-primary)] rounded-full animate-spin"></div>
           </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("flex h-full w-full overflow-hidden", theme.colors.bgBase)}>
      <Sidebar />
      <div className={cn("flex-1 relative w-full h-full flex flex-col justify-center", theme.colors.bgBase)}>
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className={cn("w-full h-full xl:max-w-[1024px] lg:max-w-[800px] md:max-w-full mx-auto relative flex flex-col md:border-x shadow-2xl z-10", theme.colors.bgBase, theme.colors.borderSubtle)}>
          <div className="flex-1 overflow-y-auto w-full relative no-scrollbar pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("flex h-full w-full overflow-hidden", theme.colors.bgBase)}>
      <Sidebar />
      <div className={cn("flex-1 relative w-full h-full overflow-hidden flex xl:justify-center", theme.colors.bgBase)}>
        {/* Subtle background glow for desktop */}
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Desktop 3-column layout container */}
        <div className="flex w-full h-full xl:max-w-[1200px] mx-auto justify-center lg:gap-8 px-0 lg:px-8 z-10">
           
           {/* Center Feed Column */}
           <div className={cn("w-full md:max-w-[480px] lg:max-w-[460px] shrink-0 h-full relative md:border-x shadow-2xl overflow-hidden mx-auto xl:mx-0 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0", theme.colors.bgBase, theme.colors.borderSubtle)}>
             <div className="size-full">
               {children}
             </div>
           </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="min-h-full bg-bg-base text-text-primary flex flex-col items-center justify-center p-6 text-center">
      <div className="size-16 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
        <Database className="size-8" />
      </div>
      <h1 className="text-2xl font-bold mb-4">Supabase Required</h1>
      <p className="text-text-secondary mb-8 max-w-sm">
        To power the backend for Getnayi, you need to configure your Supabase environment variables.
      </p>
      
      <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 w-full max-w-sm text-left shadow-lg">
        <h2 className="font-semibold text-sm mb-3 flex items-center text-text-primary">
          <span className="size-5 rounded-full bg-white text-black flex items-center justify-center text-xs mr-2">1</span>
          Add Variables to .env
        </h2>
        <pre className="text-xs font-mono text-text-secondary bg-bg-base p-3 rounded-lg overflow-x-auto border border-border-subtle">
          VITE_SUPABASE_URL="https://..."<br/>
          VITE_SUPABASE_ANON_KEY="ey..."
        </pre>
        
        <h2 className="font-semibold text-sm mt-5 mb-3 flex items-center text-text-primary">
          <span className="size-5 rounded-full bg-white text-black flex items-center justify-center text-xs mr-2">2</span>
          Run Schema Script
        </h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          Open the <code className="bg-bg-base border border-border-subtle px-1 py-0.5 rounded text-text-primary/80">database.sql</code> file provided in this workspace and execute it in your Supabase SQL Editor to set up tables and storage.
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-full bg-bg-base text-text-primary relative flex flex-col font-sans">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
           <div className="relative flex items-center justify-center size-12">
             <div className="size-5 border-2 border-brand-primary/20 border-t-[var(--color-brand-primary)] rounded-full animate-spin"></div>
           </div>
        </div>
      </div>
    );
  }

  if (user) {
    const hasOnboarded = user.user_metadata?.onboarded === true;
    if (!hasOnboarded && location.pathname !== '/interests') {
      return <Navigate to="/interests" replace />;
    }
    if (hasOnboarded && (location.pathname === '/interests' || location.pathname === '/auth')) {
      const returnTo = location.state?.returnTo || '/';
      return <Navigate to={returnTo} replace />;
    }
  }

  return (
    <>
      <SEO />
      <PWAInstallPrompt />
      <ErrorBoundary>
        <Suspense fallback={
          <div className="h-full bg-bg-base text-text-primary relative flex flex-col font-sans">
            <div className="flex-1 flex flex-col items-center justify-center p-8">
               <div className="relative flex items-center justify-center size-12">
                 <div className="size-5 border-2 border-brand-primary/20 border-t-[var(--color-brand-primary)] rounded-full animate-spin"></div>
               </div>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/auth" element={!user ? <MainLayout><AuthPage /></MainLayout> : <Navigate to={location.state?.returnTo || "/"} replace />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/interests" element={<ProtectedRoute><MainLayout><Interests /></MainLayout></ProtectedRoute>} />
          <Route path="/" element={<FeedLayout><Feed /></FeedLayout>} />
          <Route path="/video/:videoId" element={<FeedLayout><Feed /></FeedLayout>} />
          <Route path="/explore" element={<MainLayout><Explore /></MainLayout>} />
          <Route path="/trending" element={<MainLayout><Trending /></MainLayout>} />
          <Route path="/saved" element={<ProtectedRoute><MainLayout><Saved /></MainLayout></ProtectedRoute>} />
          <Route path="/collection/:id" element={<ProtectedRoute><MainLayout><Collection /></MainLayout></ProtectedRoute>} />
          <Route path="/shared-collection" element={<MainLayout><SharedCollection /></MainLayout>} />
          <Route path="/s/:shortId" element={<ShortUrlRedirect />} />
          <Route path="/store/:name" element={<MainLayout><StoreFeed /></MainLayout>} />
          <Route path="/category/:id" element={<MainLayout><CategoryFeed /></MainLayout>} />

          <Route path="/creator-verification" element={<ProtectedRoute><MainLayout><CreatorVerification /></MainLayout></ProtectedRoute>} />
          <Route path="/creator-dashboard" element={<ProtectedRoute><MainLayout><CreatorDashboard /></MainLayout></ProtectedRoute>} />
          <Route path="/subscription" element={<MainLayout><Subscription /></MainLayout>} />
          <Route path="/settings/subscription" element={<ProtectedRoute><MainLayout><SubscriptionSettings /></MainLayout></ProtectedRoute>} />
          <Route path="/notifications" element={<MainLayout><Notifications /></MainLayout>} />
          <Route 
            path="/upload" 
            element={
              <MainLayout><Upload /></MainLayout>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <MainLayout><ProfilePage /></MainLayout>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <MainLayout><Admin /></MainLayout>
              </ProtectedRoute>
            } 
          />
          <Route path="/privacy" element={<MainLayout><PrivacyPolicy /></MainLayout>} />
          <Route path="/terms" element={<MainLayout><TermsOfService /></MainLayout>} />
          <Route path="*" element={
            <MainLayout>
              <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                <h1 className="text-[17px] font-bold text-text-primary mb-2 tracking-wide">Page not found</h1>
                <p className="text-[13px] text-text-secondary max-w-[240px] leading-relaxed">The link you followed may be broken, or the page may have been removed.</p>
              </div>
            </MainLayout>
          } />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Toaster theme="dark" position="top-center" />
      <CookieConsent />
    </>
  );
}

export default function App() {
  React.useEffect(() => {
    const blockClipboard = (e: ClipboardEvent) => {
      // Allow copy inside input, textarea or contenteditable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
    };

    const blockSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('copy', blockClipboard, { capture: true });
    document.addEventListener('cut', blockClipboard, { capture: true });
    document.addEventListener('selectstart', blockSelectStart, { capture: true });

    return () => {
      document.removeEventListener('copy', blockClipboard, { capture: true });
      document.removeEventListener('cut', blockClipboard, { capture: true });
      document.removeEventListener('selectstart', blockSelectStart, { capture: true });
    };
  }, []);

  if (!isSupabaseConfigured) {
    return <SetupScreen />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
