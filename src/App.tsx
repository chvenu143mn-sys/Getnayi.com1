import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { SEO } from './components/SEO';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy loaded pages for Code Splitting
const AuthPage = React.lazy(() => import('./pages/Auth'));
const Feed = React.lazy(() => import('./pages/Feed'));
const Upload = React.lazy(() => import('./pages/Upload'));
const ProfilePage = React.lazy(() => import('./pages/Profile'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Explore = React.lazy(() => import('./pages/Explore'));
const Trending = React.lazy(() => import('./pages/Trending'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Subscription = React.lazy(() => import('./pages/Subscription'));
const SubscriptionSettings = React.lazy(() => import('./pages/SubscriptionSettings'));
const Saved = React.lazy(() => import('./pages/Saved'));
const Collection = React.lazy(() => import('./pages/Collection'));
const SharedCollection = React.lazy(() => import('./pages/SharedCollection'));
const CreatorVerification = React.lazy(() => import('./pages/CreatorVerification'));
const CreatorDashboard = React.lazy(() => import('./pages/CreatorDashboard'));
const StoreFeed = React.lazy(() => import('./pages/StoreFeed'));
const CategoryFeed = React.lazy(() => import('./pages/CategoryFeed'));
const ShortUrlRedirect = React.lazy(() => import('./pages/ShortUrlRedirect'));
const UpdatePasswordPage = React.lazy(() => import('./pages/UpdatePassword'));
const Interests = React.lazy(() => import('./pages/Interests'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));

import { isSupabaseConfigured } from './lib/supabase';
import { Database } from 'lucide-react';
import { Toaster } from 'sonner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-full bg-[#0c0c0e] text-white relative flex flex-col font-sans">
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-y-6">
           <div className="size-12 bg-zinc-800 rounded-2xl animate-pulse"></div>
           <div className="w-32 h-4 bg-zinc-800 rounded-md animate-pulse"></div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
}

import { Footer } from './components/Footer';

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full bg-[#0c0c0e] overflow-hidden">
      <Sidebar />
      <div className="flex-1 relative w-full h-full flex flex-col justify-center">
        <div className="w-full h-full xl:max-w-[1024px] lg:max-w-[800px] md:max-w-[600px] mx-auto relative flex flex-col md:border-x md:border-white/10 bg-[#0c0c0e] shadow-2xl">
          <div className="flex-1 overflow-y-auto w-full relative no-scrollbar pb-[calc(60px+env(safe-area-bottom))] md:pb-0">
            <div className="min-h-full flex flex-col">
              <div className="flex-1">
                {children}
              </div>
              <Footer />
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full bg-[#0c0c0e] overflow-hidden">
      <Sidebar />
      <div className="flex-1 relative w-full h-full overflow-hidden flex justify-center bg-black">
        <div className="w-full md:max-w-[414px] lg:max-w-[480px] h-full relative bg-[#0c0c0e] shadow-2xl">
          <div className="size-full">
            {children}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="min-h-full bg-[#0c0c0e] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="size-16 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
        <Database className="size-8" />
      </div>
      <h1 className="text-2xl font-bold mb-4">Supabase Required</h1>
      <p className="text-zinc-400 mb-8 max-w-sm">
        To power the backend for Getnayi, you need to configure your Supabase environment variables.
      </p>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full max-w-sm text-left shadow-lg">
        <h2 className="font-semibold text-sm mb-3 flex items-center text-zinc-300">
          <span className="size-5 rounded-full bg-white text-black flex items-center justify-center text-xs mr-2">1</span>
          Add Variables to .env
        </h2>
        <pre className="text-xs font-mono text-zinc-500 bg-[#0c0c0e] p-3 rounded-lg overflow-x-auto border border-zinc-800">
          VITE_SUPABASE_URL="https://..."<br/>
          VITE_SUPABASE_ANON_KEY="ey..."
        </pre>
        
        <h2 className="font-semibold text-sm mt-5 mb-3 flex items-center text-zinc-300">
          <span className="size-5 rounded-full bg-white text-black flex items-center justify-center text-xs mr-2">2</span>
          Run Schema Script
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Open the <code className="bg-[#0c0c0e] border border-zinc-800 px-1 py-0.5 rounded text-white/80">database.sql</code> file provided in this workspace and execute it in your Supabase SQL Editor to set up tables and storage.
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
      <div className="h-full bg-[#0c0c0e] text-white relative flex flex-col font-sans">
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-y-6">
           <div className="size-12 bg-zinc-800 rounded-2xl animate-pulse"></div>
           <div className="w-32 h-4 bg-zinc-800 rounded-md animate-pulse"></div>
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
          <div className="h-full bg-[#0c0c0e] text-white relative flex flex-col font-sans">
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-y-6">
               <div className="size-12 bg-zinc-800 rounded-2xl animate-pulse"></div>
               <div className="w-32 h-4 bg-zinc-800 rounded-md animate-pulse"></div>
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
          <Route path="/notifications" element={<ProtectedRoute><MainLayout><Notifications /></MainLayout></ProtectedRoute>} />
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
              <div className="flex flex-col items-center justify-center p-8 text-center h-[50vh]">
                <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
                <p className="text-gray-400">The page you are looking for doesn't exist or has been moved.</p>
              </div>
            </MainLayout>
          } />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Toaster theme="dark" position="top-center" />
    </>
  );
}

export default function App() {
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
