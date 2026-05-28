import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BottomNav } from './components/BottomNav';
import AuthPage from './pages/Auth';
import Feed from './pages/Feed';
import Upload from './pages/Upload';
import ProfilePage from './pages/Profile';
import Admin from './pages/Admin';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';
import Saved from './pages/Saved';
import Collection from './pages/Collection';
import SharedCollection from './pages/SharedCollection';
import CreatorVerification from './pages/CreatorVerification';
import CreatorDashboard from './pages/CreatorDashboard';
import ShortUrlRedirect from './pages/ShortUrlRedirect';
import { isSupabaseConfigured } from './lib/supabase';
import { Database } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-[100dvh] bg-black text-white relative flex flex-col font-sans">
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
           <div className="w-12 h-12 bg-zinc-800 rounded-2xl animate-pulse"></div>
           <div className="w-32 h-4 bg-zinc-800 rounded-md animate-pulse"></div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  
  return <>{children}</>;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto relative h-[100dvh] bg-black shadow-2xl flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto w-full relative no-scrollbar pb-[calc(60px+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto relative h-[100dvh] bg-black shadow-2xl overflow-hidden">
      <div className="w-full h-full">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
        <Database className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold mb-4">Supabase Required</h1>
      <p className="text-zinc-400 mb-8 max-w-sm">
        To power the backend for Getnayi, you need to configure your Supabase environment variables.
      </p>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full max-w-sm text-left shadow-lg">
        <h2 className="font-semibold text-sm mb-3 flex items-center text-zinc-300">
          <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-xs mr-2">1</span>
          Add Variables to .env
        </h2>
        <pre className="text-xs font-mono text-zinc-500 bg-black p-3 rounded-lg overflow-x-auto border border-zinc-800">
          VITE_SUPABASE_URL="https://..."<br/>
          VITE_SUPABASE_ANON_KEY="ey..."
        </pre>
        
        <h2 className="font-semibold text-sm mt-5 mb-3 flex items-center text-zinc-300">
          <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-xs mr-2">2</span>
          Run Schema Script
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Open the <code className="bg-black border border-zinc-800 px-1 py-0.5 rounded text-white/80">database.sql</code> file provided in this workspace and execute it in your Supabase SQL Editor to set up tables and storage.
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" />} />
      <Route path="/" element={<FeedLayout><Feed /></FeedLayout>} />
      <Route path="/video/:videoId" element={<FeedLayout><Feed /></FeedLayout>} />
      <Route path="/explore" element={<MainLayout><Explore /></MainLayout>} />
      <Route path="/saved" element={<ProtectedRoute><MainLayout><Saved /></MainLayout></ProtectedRoute>} />
      <Route path="/collection/:id" element={<ProtectedRoute><MainLayout><Collection /></MainLayout></ProtectedRoute>} />
      <Route path="/shared-collection" element={<MainLayout><SharedCollection /></MainLayout>} />
      <Route path="/s/:shortId" element={<ShortUrlRedirect />} />

      <Route path="/creator-verification" element={<ProtectedRoute><MainLayout><CreatorVerification /></MainLayout></ProtectedRoute>} />
      <Route path="/creator-dashboard" element={<ProtectedRoute><MainLayout><CreatorDashboard /></MainLayout></ProtectedRoute>} />
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
      <Route path="*" element={
        <MainLayout>
          <div className="flex flex-col items-center justify-center p-8 text-center h-[50vh]">
            <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
            <p className="text-gray-400">The page you are looking for doesn't exist or has been moved.</p>
          </div>
        </MainLayout>
      } />
    </Routes>
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
