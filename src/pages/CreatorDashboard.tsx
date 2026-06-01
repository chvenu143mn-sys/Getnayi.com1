import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  Heart, 
  Bookmark, 
  MessageSquare, 
  TrendingUp, 
  Sparkles, 
  ArrowLeft, 
  Play, 
  Search, 
  CheckCircle, 
  RefreshCw, 
  Info, 
  ChevronRight, 
  Video as VideoIcon,
  HelpCircle,
  Award,
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Video, Profile } from '../types';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const isPie = !label && payload[0]?.name;
    const title = isPie ? payload[0].name : label;
    const data = payload[0].payload;
    const hasMultipleSeries = payload.length > 1;

    return (
      <div className="bg-[#151518]/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl gap-y-1.5 font-sans min-w-[125px]">
        {title && (
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{title}</p>
        )}
        <div className="gap-y-1">
          {isPie ? (
            <div className="flex items-center gap-x-2 text-[12.5px]">
              <span 
                className="size-2 rounded-full shrink-0" 
                style={{ backgroundColor: payload[0].payload?.color || payload[0].color || '#ef2950' }} 
              />
              <span className="text-zinc-300 font-medium">Value:</span>
              <span className="text-white font-mono font-bold">
                {payload[0].value >= 1000 ? (payload[0].value / 1000).toFixed(1) + 'K' : payload[0].value}
              </span>
            </div>
          ) : hasMultipleSeries ? (
            payload.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-x-2 text-[12.5px]">
                <span 
                  className="size-2 rounded-full shrink-0" 
                  style={{ backgroundColor: item.fill || item.color || '#ef2950' }} 
                />
                <span className="text-zinc-300 font-medium">{item.name}:</span>
                <span className="text-white font-mono font-bold">
                  {item.value >= 1000 ? (item.value / 1000).toFixed(1) + 'K' : item.value}
                </span>
              </div>
            ))
          ) : (
            <>
              {data && data.Views !== undefined ? (
                <>
                  <div className="flex items-center gap-x-2 text-[12.5px]">
                    <span className="size-2 rounded-full bg-[#ef2955] shrink-0" />
                    <span className="text-zinc-400 font-medium">Views:</span>
                    <span className="text-white font-mono font-bold">
                      {data.Views >= 1000 ? (data.Views / 1000).toFixed(1) + 'K' : data.Views}
                    </span>
                  </div>
                  {data.Likes !== undefined && (
                    <div className="flex items-center gap-x-2 text-[12.5px]">
                      <span className="size-2 rounded-full bg-[#ef2950]/60 shrink-0" />
                      <span className="text-zinc-400 font-medium">Likes:</span>
                      <span className="text-white font-mono font-bold">
                        {data.Likes >= 1000 ? (data.Likes / 1000).toFixed(1) + 'K' : data.Likes}
                      </span>
                    </div>
                  )}
                  {data.Saves !== undefined && (
                    <div className="flex items-center gap-x-2 text-[12.5px]">
                      <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-zinc-400 font-medium">Saves:</span>
                      <span className="text-white font-mono font-bold">
                        {data.Saves >= 1000 ? (data.Saves / 1000).toFixed(1) + 'K' : data.Saves}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                payload.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-x-2 text-[12.5px]">
                    <span 
                      className="size-2 rounded-full shrink-0" 
                      style={{ backgroundColor: item.fill || item.color || '#ef2950' }} 
                    />
                    <span className="text-zinc-300 font-medium">{item.name}:</span>
                    <span className="text-white font-mono font-bold">
                      {item.value >= 1000 ? (item.value / 1000).toFixed(1) + 'K' : item.value}
                    </span>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [engagementDetails, setEngagementDetails] = useState({
    likesByVideo: {} as Record<string, number>,
    commentsByVideo: {} as Record<string, number>,
    savesByVideo: {} as Record<string, number>
  });
  
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeChartTab, setActiveChartTab] = useState<'trends' | 'comparison' | 'distribution'>('trends');

  useEffect(() => {
    if (user) {
      fetchCreatorData();
    }
  }, [user]);

  const fetchCreatorData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      if (profileData) setProfile(profileData);

      // 2. Fetch Creator's Videos
      const { data: videosData } = await supabase
        .from('videos')
        .select('*, categories (id, name)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      const myVideos = videosData || [];
      setVideos(myVideos);

      if (myVideos.length > 0) {
        const videoIds = myVideos.map(v => v.id);

        try {
          // Attempt high-performance path using Postgres DB View aggregation
          const { data: statsData, error: statsError } = await supabase
            .from('creator_video_stats')
            .select('*')
            .eq('user_id', user?.id);

          if (!statsError && statsData && statsData.length > 0) {
            const likesByVideo: Record<string, number> = {};
            const commentsByVideo: Record<string, number> = {};
            const savesByVideo: Record<string, number> = {};

            statsData.forEach((stat: any) => {
              likesByVideo[stat.video_id] = stat.likes_count || 0;
              commentsByVideo[stat.video_id] = stat.comments_count || 0;
              savesByVideo[stat.video_id] = stat.saves_count || 0;
            });

            setEngagementDetails({
              likesByVideo,
              commentsByVideo,
              savesByVideo
            });
          } else {
            throw new Error('Fallback to metadata counts');
          }
        } catch (fbErr) {
          // Fallback path: count-header checking in parallel (downloads 0 rows)
          const likesByVideo: Record<string, number> = {};
          const commentsByVideo: Record<string, number> = {};
          const savesByVideo: Record<string, number> = {};

          videoIds.forEach(id => {
            likesByVideo[id] = 0;
            commentsByVideo[id] = 0;
            savesByVideo[id] = 0;
          });

          const countsPromises = videoIds.map(async (id) => {
            try {
              const [lCount, cCount, sCount] = await Promise.all([
                supabase.from('likes').select('*', { count: 'exact', head: true }).eq('video_id', id),
                supabase.from('comments').select('*', { count: 'exact', head: true }).eq('video_id', id),
                supabase.from('saved_videos').select('*', { count: 'exact', head: true }).eq('video_id', id)
              ]);

              likesByVideo[id] = lCount.count || 0;
              commentsByVideo[id] = cCount.count || 0;
              savesByVideo[id] = sCount.count || 0;
            } catch (pErr) {
              console.error(`Error loading count for video ${id}`, pErr);
            }
          });

          await Promise.all(countsPromises);

          setEngagementDetails({
            likesByVideo,
            commentsByVideo,
            savesByVideo
          });
        }
      }
    } catch (err) {
      console.error('Error loading creator dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Demo / Mock Data for rich visualization
  const demoStats = {
    totalViews: 142500,
    totalLikes: 12400,
    totalSaves: 1210,
    totalComments: 342,
    engagementRate: 9.7, // %
  };

  const demoTrendData = [
    { name: 'Mon', Views: 12000, Likes: 1100, Saves: 120 },
    { name: 'Tue', Views: 15000, Likes: 1400, Saves: 150 },
    { name: 'Wed', Views: 18000, Likes: 1600, Saves: 180 },
    { name: 'Thu', Views: 16000, Likes: 1300, Saves: 140 },
    { name: 'Fri', Views: 22000, Likes: 1900, Saves: 210 },
    { name: 'Sat', Views: 31000, Likes: 2700, Saves: 250 },
    { name: 'Sun', Views: 28500, Likes: 2400, Saves: 160 },
  ];

  const demoVideosComparison = [
    { name: 'Glow Dew Review', Views: 42000, Likes: 3600 },
    { name: 'Skincare routine', Views: 31000, Likes: 2900 },
    { name: 'Morning Glow up', Views: 28000, Likes: 2100 },
    { name: 'Affordable Serums', Views: 22000, Likes: 1800 },
    { name: 'Glass Skin Secret', Views: 19500, Likes: 2000 },
  ];

  const demoDistribution = [
    { name: 'Likes', value: 12400, color: '#ef2950' },
    { name: 'Saved', value: 1210, color: '#facc15' },
    { name: 'Comments', value: 342, color: '#3897f0' },
  ];

  const demoVideosList = [
    { id: '1', caption: 'My Glowing Skin Hydration Routine with Dew Serum ✨🌿 #skincare', views: 42000, likes: 3600, comments: 120, saves: 480, status: 'active', created_at: '2026-05-18T10:00:00Z', thumbnail_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=150&q=80' },
    { id: '2', caption: 'The ultimate glass skin routine on a budget! 😍 Full tutorial inside', views: 31050, likes: 2980, comments: 92, saves: 310, status: 'active', created_at: '2026-05-20T14:30:00Z', thumbnail_url: 'https://images.unsplash.com/photo-1596462502278-27bf85033e5a?auto=format&fit=crop&w=150&q=80' },
    { id: '3', caption: 'Testing affordable vitamin C serums for 30 days... here are the results', views: 22400, likes: 1850, comments: 65, saves: 220, status: 'active', created_at: '2026-05-22T08:15:00Z', thumbnail_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80' },
    { id: '4', caption: 'NEW Brightening Booster review - does it actually work? Honest opinion! 🧪', views: 19500, likes: 2020, comments: 45, saves: 110, status: 'pending_review', created_at: '2026-05-25T11:00:00Z', thumbnail_url: 'https://images.unsplash.com/photo-1556228578-8d89f2142d76?auto=format&fit=crop&w=150&q=80' }
  ];

  // Active / Live Calculations
  const liveTotalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const liveTotalLikes = Object.values(engagementDetails.likesByVideo).reduce((sum, val) => sum + val, 0);
  const liveTotalSaves = Object.values(engagementDetails.savesByVideo).reduce((sum, val) => sum + val, 0);
  const liveTotalComments = Object.values(engagementDetails.commentsByVideo).reduce((sum, val) => sum + val, 0);
  const liveEngagementRate = liveTotalViews > 0 
    ? parseFloat((((liveTotalLikes + liveTotalSaves + liveTotalComments) / liveTotalViews) * 100).toFixed(1)) 
    : 0;

  // Render variables based on Mode toggle
  const totalViews = isDemoMode ? demoStats.totalViews : liveTotalViews;
  const totalLikes = isDemoMode ? demoStats.totalLikes : liveTotalLikes;
  const totalSaves = isDemoMode ? demoStats.totalSaves : liveTotalSaves;
  const totalComments = isDemoMode ? demoStats.totalComments : liveTotalComments;
  const engagementRate = isDemoMode ? demoStats.engagementRate : liveEngagementRate;

  // Render list of videos
  const displayVideos = isDemoMode 
    ? demoVideosList.filter(v => v.caption.toLowerCase().includes(searchTerm.toLowerCase()))
    : videos.map(v => ({
        id: v.id,
        caption: v.caption || 'No description provided',
        views: v.views || 0,
        likes: engagementDetails.likesByVideo[v.id] || 0,
        comments: engagementDetails.commentsByVideo[v.id] || 0,
        saves: engagementDetails.savesByVideo[v.id] || 0,
        status: v.status || 'active',
        created_at: v.created_at,
        thumbnail_url: v.thumbnail_url || v.main_product_image_url
      })).filter(v => v.caption.toLowerCase().includes(searchTerm.toLowerCase()));

  // Active charts datasets based on mode
  const trendData = isDemoMode ? demoTrendData : [
    ...displayVideos.slice(0, 7).reverse().map((v, i) => ({
      name: `V${i+1}`,
      Views: v.views,
      Likes: v.likes,
      Saves: v.saves
    }))
  ];

  // If live data has too few elements for trend representation, fill with realistic zero values or fallback
  const finalTrendData = trendData.length > 0 ? trendData : [
    { name: 'No Videos', Views: 0, Likes: 0, Saves: 0 }
  ];

  const videosComparison = isDemoMode ? demoVideosComparison : displayVideos.slice(0, 5).map(v => ({
    name: v.caption.substring(0, 15) + '...',
    Views: v.views,
    Likes: v.likes
  }));

  const finalVideoComparison = videosComparison.length > 0 ? videosComparison : [
    { name: 'Empty', Views: 0, Likes: 0 }
  ];

  const distributionData = isDemoMode ? demoDistribution : [
    { name: 'Likes', value: totalLikes, color: '#ef2950' },
    { name: 'Saved', value: totalSaves, color: '#facc15' },
    { name: 'Comments', value: totalComments, color: '#3897f0' },
  ];

  const hasStats = isDemoMode || displayVideos.length > 0;

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white font-sans flex flex-col h-full bg-[#0c0c0e]">
      {/* Header BAR */}
      <div className="sticky top-0 z-20 bg-[#0c0c0e]/95 backdrop-blur-md pt-5 pb-3 px-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-2">
            <button type="button" aria-label="button"  
              onClick={() => navigate('/profile')} 
              className="p-2 -ml-2 text-white/90 hover:text-white transition-colors hover:bg-white/5 rounded-full"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-[18px] font-bold text-white tracking-tight flex items-center gap-1.5">
              Creator Studio
              <Award className="size-4 text-amber-400" />
            </h1>
          </div>

          {/* Clean toggle switch */}
          <div className="flex items-center gap-x-2">
            <span className="text-[11px] font-medium text-zinc-500 tracking-wide uppercase">Demo Data</span>
            <button type="button" aria-label="button"  
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isDemoMode ? 'bg-[#ef2950]' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isDemoMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pt-5 px-4">
        {loading ? (
          <div className="gap-y-6 animate-pulse">
            {/* Creator Mini Card Skeleton */}
            <div className="p-4 bg-[#151518] border border-white/5 rounded-[22px] flex items-center shadow-lg">
              <div className="size-[46px] rounded-full bg-zinc-800 shrink-0 mr-3.5" />
              <div className="flex-1 gap-y-2">
                <div className="h-4 bg-zinc-805 bg-zinc-800 rounded w-1/3" />
                <div className="h-3 bg-zinc-850 rounded w-1/2" />
              </div>
              <div className="h-6 bg-zinc-800 rounded-xl w-20" />
            </div>

            {/* Performance Ledger / Bento Grid Skeletons */}
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 bg-[#131316] border border-white/5 rounded-2xl flex flex-col justify-between h-[120px]">
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                    <div className="size-8 rounded-lg bg-zinc-800" />
                  </div>
                  <div className="gap-y-2 mt-4">
                    <div className="h-6 bg-[#18181c] bg-zinc-800 rounded w-2/3" />
                    <div className="h-3 bg-zinc-850 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>

            {/* Recharts Graphical Visualizer Skeleton */}
            <div className="p-4 bg-[#131316] border border-white/5 rounded-3xl shadow-lg flex flex-col">
              <div className="flex flex-col mb-4">
                <div className="h-4 bg-zinc-800 rounded w-2/3 mb-4" />
                <div className="flex gap-2.5">
                  <div className="h-7 bg-zinc-800 rounded-lg w-28" />
                  <div className="h-7 bg-zinc-850 rounded-lg w-24" />
                  <div className="h-7 bg-zinc-850 rounded-lg w-24" />
                </div>
              </div>
              {/* Dummy Chart Simulating Shimmer Lines and Bar shapes */}
              <div className="h-[220px] w-full flex flex-col justify-end pt-5 gap-y-4 px-2">
                <div className="flex-1 flex items-end justify-between gap-x-4">
                  {[40, 70, 45, 90, 60, 85, 50].map((height, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-y-2">
                      <div className="w-full bg-zinc-800/60 rounded-t" style={{ height: `${height}%` }} />
                      <div className="h-2 bg-zinc-850 rounded w-8" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Growth Analytics & Smart Insights Skeleton */}
            <div className="bg-[#131316] border border-white/5 p-5 rounded-[26px] flex items-start">
              <div className="size-10 bg-zinc-800 rounded-2xl mr-4 shrink-0" />
              <div className="flex-1 gap-y-2.5">
                <div className="h-4 bg-zinc-800 rounded w-1/4" />
                <div className="h-3 bg-zinc-850 rounded w-full" />
                <div className="h-3 bg-zinc-850 rounded w-5/6" />
              </div>
            </div>

            {/* Video List of uploads / performance list Skeleton */}
            <div className="flex flex-col mb-6 gap-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-5 bg-zinc-800 rounded w-40" />
                <div className="h-3 bg-zinc-850 rounded w-16" />
              </div>
              <div className="h-11 bg-[#131316] border border-white/5 rounded-2xl w-full" />
              {[1, 2, 3].map((item) => (
                <div key={item} className="p-3.5 bg-[#131316] border border-white/5 rounded-2xl flex items-center">
                  <div className="w-[50px] h-[64px] rounded-xl bg-zinc-800 shrink-0 mr-4" />
                  <div className="flex-1 gap-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-2/3" />
                    <div className="h-3 bg-zinc-500/10 rounded w-1/3" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 w-20 shrink-0">
                    <div className="h-3 bg-zinc-800 rounded" />
                    <div className="h-3 bg-zinc-800 rounded" />
                    <div className="h-3 bg-zinc-850 rounded" />
                    <div className="h-3 bg-zinc-850 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : profile && !profile.can_upload && !profile.is_admin ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center px-4">
            <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
              <ShieldAlert className="size-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-zinc-400 max-w-[280px]">
              You need Creator or Administrator privileges to access the Creator Studio.
            </p>
            <button type="button" aria-label="Return" onClick={() => navigate(-1)} className="mt-8 px-6 py-2.5 bg-white text-black font-semibold rounded-xl text-sm transition-transform active:scale-95">
              Go Back
            </button>
          </div>
        ) : (
          <div className="gap-y-6">
            {/* Creator Mini Card */}
            <div className="p-4 bg-gradient-to-r from-[#17171e] to-[#151518] border border-white/5 rounded-[22px] flex items-center shadow-lg">
              <div className="size-[46px] rounded-full overflow-hidden bg-zinc-850 shrink-0 mr-3.5 border border-white/10 ring-2 ring-white/5 shadow-inner">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center text-white/50 bg-zinc-800 text-[14px] uppercase font-bold font-serif italic">
                    {profile?.username?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <span className="text-[14px] font-semibold text-white tracking-wide block truncate">
                  {profile?.username || 'Glow With Sia'}
                </span>
                <span className="text-[11.5px] font-medium text-zinc-500 tracking-wide lowercase block leading-tight">
                  @{profile?.username?.toLowerCase() || 'creator'} • 142 Posts
                </span>
              </div>
              
              <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 text-[10.5px] font-bold rounded-xl tracking-wider uppercase shadow-[0_0_12px_rgba(99,102,241,0.1)] shrink-0 flex items-center gap-1 font-mono">
                <Sparkles className="size-3.5 animate-pulse" />
                Insight pro
              </div>
            </div>

            {/* Performance Ledger / Bento Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Views */}
              <div className="p-4 bg-[#131316] border border-white/5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-zinc-500 tracking-wide uppercase">Total Views</span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                    <Eye className="size-4" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col">
                  <span className="text-[22px] font-bold font-sans text-white tracking-tight">
                    {totalViews >= 1000000 ? (totalViews / 1000000).toFixed(1) + 'M' : totalViews >= 1000 ? (totalViews / 1000).toFixed(1) + 'K' : totalViews}
                  </span>
                  <span className="text-[10.5px] font-medium text-emerald-400 mt-1 flex items-center gap-0.5">
                    <TrendingUp className="size-3" /> +12.4% vs last week
                  </span>
                </div>
              </div>

              {/* Likes */}
              <div className="p-4 bg-[#131316] border border-white/5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-zinc-500 tracking-wide uppercase">Total Likes</span>
                  <div className="p-1.5 rounded-lg bg-[#ef2950]/10 text-[#ef2950] border border-[#ef2950]/10">
                    <Heart className="size-4 fill-[#ef2950]/10" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col">
                  <span className="text-[22px] font-bold font-sans text-white tracking-tight">
                    {totalLikes >= 1000000 ? (totalLikes / 1000000).toFixed(1) + 'M' : totalLikes >= 1000 ? (totalLikes / 1000).toFixed(1) + 'K' : totalLikes}
                  </span>
                  <span className="text-[10.5px] font-medium text-[#ef2950] mt-1 flex items-center gap-0.5">
                    <TrendingUp className="size-3" /> +8.1% vs last week
                  </span>
                </div>
              </div>

              {/* Saves */}
              <div className="p-4 bg-[#131316] border border-white/5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-zinc-500 tracking-wide uppercase">Saves (Saves)</span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/10">
                    <Bookmark className="size-4 fill-amber-500/10" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col">
                  <span className="text-[22px] font-bold font-sans text-white tracking-tight">
                    {totalSaves >= 1000000 ? (totalSaves / 1000000).toFixed(1) + 'M' : totalSaves >= 1000 ? (totalSaves / 1000).toFixed(1) + 'K' : totalSaves}
                  </span>
                  <span className="text-[10.5px] font-medium text-amber-401 text-zinc-500 mt-1 flex items-center gap-0.5">
                    Total organic bookmarks
                  </span>
                </div>
              </div>

              {/* Engagement Rate */}
              <div className="p-4 bg-[#131316] border border-white/5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-zinc-500 tracking-wide uppercase">Engagement Rate</span>
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-400/10">
                    <TrendingUp className="size-4" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col">
                  <span className="text-[22px] font-bold font-sans text-white tracking-tight">
                    {engagementRate}%
                  </span>
                  <span className="text-[10.5px] font-medium text-[#ef2950]/90 mt-1 flex items-center gap-0.5">
                    ✨ Industry benchmark is 3.5%
                  </span>
                </div>
              </div>
            </div>

            {/* Recharts Graphical Visualizers */}
            <div className="p-4 bg-[#131316] border border-white/5 rounded-3xl shadow-lg flex flex-col">
              <div className="flex flex-col mb-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-[15px] font-bold text-white tracking-wide">Interactive Performance Metrics</h3>
                </div>
                
                {/* Horizontal mini navigation for charts */}
                <div className="flex gap-2.5 mt-3.5 pt-1.5 border-t border-white/5">
                  <button type="button" aria-label="button"  
                    onClick={() => setActiveChartTab('trends')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      activeChartTab === 'trends' ? 'bg-[#ef2950] text-white shadow-sm' : 'bg-transparent text-zinc-500 hover:text-white/80'
                    }`}
                  >
                    Audience growth
                  </button>
                  <button type="button" aria-label="button"  
                    onClick={() => setActiveChartTab('comparison')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      activeChartTab === 'comparison' ? 'bg-[#ef2950] text-white shadow-sm' : 'bg-transparent text-zinc-500 hover:text-white/80'
                    }`}
                  >
                    Top videos comparison
                  </button>
                  <button type="button" aria-label="button"  
                    onClick={() => setActiveChartTab('distribution')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      activeChartTab === 'distribution' ? 'bg-[#ef2950] text-white shadow-sm' : 'bg-transparent text-zinc-500 hover:text-white/80'
                    }`}
                  >
                    Action distribution
                  </button>
                </div>
              </div>

              {!hasStats ? (
                <div className="h-[210px] w-full flex flex-col items-center justify-center text-zinc-600 gap-y-2 border border-dashed border-white/5 rounded-2xl">
                   <Info className="size-8 opacity-40 text-zinc-500" strokeWidth={1.5} />
                   <p className="text-xs">No analytics charts available.</p>
                   <p className="text-[10.5px] text-zinc-700">Upload your very first video to populate.</p>
                </div>
              ) : (
                <div className="h-[220px] w-full text-zinc-400 text-xs">
                  {activeChartTab === 'trends' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={finalTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef2950" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#ef2950" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '10px' }} />
                        <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="Views" stroke="#ef2950" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                        <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}

                  {activeChartTab === 'comparison' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={finalVideoComparison} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '8px' }} />
                        <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Views" fill="#3897f0" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Likes" fill="#ef2950" radius={[4, 4, 0, 0]} />
                        <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {activeChartTab === 'distribution' && (
                    <div className="flex items-center h-full justify-around w-full">
                      <div className="h-full w-[170px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={distributionData.filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {distributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col gap-y-2 text-zinc-400 pl-4 pr-2 flex-1 justify-center">
                        {distributionData.map((entry, i) => (
                          <div key={i} className="flex items-center text-[11px] font-sans tracking-wide">
                            <span className="size-2.5 rounded-full mr-2.5 shrink-0" style={{ backgroundColor: entry.color }} />
                            <span className="font-medium text-white/95 mr-1.5">{entry.name}:</span>
                            <span className="font-mono text-zinc-500 font-bold">{entry.value >= 1000 ? (entry.value / 1000).toFixed(1) + 'K' : entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Growth Analytics & Smart Insights */}
            <div className="bg-gradient-to-br from-[#101013] to-[#141417] border border-indigo-500/10 p-5 rounded-[26px] shadow-sm flex items-start">
               <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl mr-4 shrink-0 shadow-[0_4px_12px_rgba(99,102,241,0.15)]">
                 <Sparkles className="size-[18px]" />
               </div>
               <div className="flex-1">
                 <h4 className="text-[13.5px] font-bold text-white tracking-wide">AI Recommendation for @{profile?.username || 'Glow'}</h4>
                 <p className="text-[12.5px] text-zinc-400 leading-relaxed mt-1.5 tracking-wide font-normal">
                   Videos using <span className="font-semibold text-white">#skincare</span> with verified authentic Amazon links are experiencing a <span className="font-semibold text-emerald-400">+38% boost</span> in saved counts. Try adding a serum link in your next upload process to grow faster.
                 </p>
               </div>
            </div>

            {/* Video List of uploads / performance list */}
            <div className="flex flex-col mb-6">
              <div className="flex items-center justify-between mb-4.5">
                <h3 className="text-[15.5px] font-bold text-white tracking-wide">Video List & Video Ledger</h3>
                <span className="text-[11px] font-medium text-zinc-500 font-mono">({displayVideos.length} Posts)</span>
              </div>

              {/* Search video list bar */}
              <div className="relative mb-4">
                 <Search className="size-4 text-zinc-501 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                 <input 
                   type="text" 
                   placeholder="Search video ledger..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-11 pr-5 py-3 bg-[#131316] border border-white/5 rounded-2xl text-[13.5px] text-white/90 placeholder-zinc-500 focus:outline-none focus:border-[#ef2950] transition-colors"
                 />
              </div>

              {displayVideos.length === 0 ? (
                 <div className="py-12 text-center text-zinc-650 flex flex-col items-center justify-center bg-[#131316] border border-dashed border-white/5 rounded-3xl text-zinc-500/80">
                   <VideoIcon className="size-10 text-zinc-700 mb-2.5" strokeWidth={1.5} />
                   <p className="text-sm font-semibold text-white/90">No ledger entries match search</p>
                   <p className="text-xs text-zinc-500 mt-1">Try searching another tag, word, or keyword.</p>
                 </div>
              ) : (
                 <div className="flex flex-col gap-y-3">
                   {displayVideos.map((video, index) => (
                     <div 
                       key={video.id || index}
                       onClick={() => !isDemoMode && navigate(`/video/${video.id}`)}
                       className={`p-3.5 bg-[#131316] border border-white/5 rounded-2xl flex items-center shadow-md transition-all ${
                         isDemoMode ? 'cursor-default' : 'hover:bg-white/5 cursor-pointer active:scale-[0.99]'
                       }`}
                     >
                        {/* Thumbnail */}
                        <div className="w-[50px] h-[64px] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 shrink-0 mr-4 relative">
                          {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} alt="Video thumbnail" className="size-full object-cover" />
                          ) : (
                            <div className="size-full flex items-center justify-center text-zinc-600 bg-zinc-805">
                               <Play className="size-4 text-zinc-650" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-[#0c0c0e]/60 py-0.5 text-center">
                             <span className="text-[10px] font-mono font-bold text-white/95">#{index+1}</span>
                          </div>
                        </div>

                        {/* Mid Meta */}
                        <div className="flex-1 min-w-0 pr-4.5 flex flex-col justify-center">
                           <p className="text-[13.5px] font-semibold text-white/95 truncate tracking-tight">{video.caption}</p>
                           <div className="flex items-center gap-x-2 mt-1.5 flex-wrap gap-y-1">
                             <div className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[9.5px]">
                                {video.created_at ? new Date(video.created_at).toLocaleDateString() : 'N/A'}
                             </div>
                             {video.status === 'pending_review' ? (
                               <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[9.5px] font-bold tracking-wider uppercase">
                                  Review
                               </span>
                             ) : (
                               <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9.5px] font-bold tracking-wider uppercase flex items-center gap-0.5">
                                  <CheckCircle className="size-2.5" /> Published
                               </span>
                             )}
                           </div>
                        </div>

                        {/* Performance ledger Metrics breakdown */}
                        <div className="grid grid-cols-2 gap-x-3.5 gap-y-1 text-right shrink-0 pr-1">
                           <div className="flex items-center justify-end text-[11.5px] text-zinc-400 font-mono tracking-wide">
                              <Eye className="size-3.5 mr-1 text-zinc-500" strokeWidth={2} />
                              <span>{video.views >= 1000 ? (video.views/1000).toFixed(1) + 'K' : video.views}</span>
                           </div>
                           <div className="flex items-center justify-end text-[11.5px] text-zinc-400 font-mono tracking-wide">
                              <Heart className="size-3.5 mr-1 text-[#ef2950] fill-[#ef2950]/10" strokeWidth={2} />
                              <span>{video.likes >= 1000 ? (video.likes/1000).toFixed(1) + 'K' : video.likes}</span>
                           </div>
                           <div className="flex items-center justify-end text-[11.5px] text-zinc-400 font-mono tracking-wide">
                              <Bookmark className="size-3.5 mr-1 text-amber-500" strokeWidth={2} />
                              <span>{video.saves}</span>
                           </div>
                           <div className="flex items-center justify-end text-[11.5px] text-zinc-400 font-mono tracking-wide">
                              <MessageSquare className="size-3.5 mr-1 text-indigo-400" strokeWidth={2} />
                              <span>{video.comments}</span>
                           </div>
                        </div>
                     </div>
                   ))}
                 </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
