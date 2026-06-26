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
import { parseVideoProduct } from '../utils/videoUtils';
import CreatorAnalytics from '../components/CreatorAnalytics';

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
                style={{ backgroundColor: payload[0].payload?.color || payload[0].color || '#ff5a36' }} 
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
                  style={{ backgroundColor: item.fill || item.color || '#ff5a36' }} 
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
                      <span className="size-2 rounded-full bg-[#ff5a36]/60 shrink-0" />
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
                      style={{ backgroundColor: item.fill || item.color || '#ff5a36' }} 
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
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  // Edit Video State
  const [videoToEdit, setVideoToEdit] = useState<any>(null);
  const [editVideoCaptionText, setEditVideoCaptionText] = useState('');
  const [editVideoTags, setEditVideoTags] = useState('');
  const [editVideoProductName, setEditVideoProductName] = useState('');
  const [editVideoProductPrice, setEditVideoProductPrice] = useState('');
  const [editVideoProductUrl, setEditVideoProductUrl] = useState('');
  const [editVideoCategoryId, setEditVideoCategoryId] = useState('');
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [editVideoError, setEditVideoError] = useState<string | null>(null);
  const [engagementDetails, setEngagementDetails] = useState({
    likesByVideo: {} as Record<string, number>,
    commentsByVideo: {} as Record<string, number>,
    savesByVideo: {} as Record<string, number>
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [trendingTags, setTrendingTags] = useState<string[]>(["#skincare", "#fashion", "#tech", "GRWM"]);
  const [activeChartTab, setActiveChartTab] = useState<'trends' | 'comparison' | 'distribution'>('trends');
  const [mainTab, setMainTab] = useState<'overview' | 'performance' | 'insights'>('overview');

  useEffect(() => {
    if (user) {
      fetchCreatorData();
      fetchTrendingTags();
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data) setCategories(data);
    } catch (err) {}
  };

  const fetchTrendingTags = async () => {
    try {
      const { data, error } = await supabase
        .from('trending_metrics')
        .select('tag')
        .order('score', { ascending: false })
        .limit(6);
        
      if (data && data.length > 0) {
        setTrendingTags(data.map(d => d.tag));
      }
    } catch (err) {
      console.error('Error fetching trending tags', err);
    }
  };

  const handleEditVideoClick = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    setVideoToEdit(video);
    setEditVideoError(null);
    let parsedCaption: any = {};
    try {
      if (video.caption) {
        parsedCaption = typeof video.caption === 'string' ? JSON.parse(video.caption) : video.caption;
      }
    } catch(e) {}
    setEditVideoCaptionText(parsedCaption.captionText || '');
    setEditVideoTags(Array.isArray(video.tags) ? video.tags.join(', ') : '');
    setEditVideoProductName(parsedCaption.product_name || '');
    setEditVideoProductPrice(parsedCaption.product_price ? parsedCaption.product_price.toString() : '');
    setEditVideoProductUrl(video.product_url || '');
    setEditVideoCategoryId(video.category_id || '');
  };

  const handleSaveVideoEdit = async () => {
    if (!videoToEdit) return;
    setIsEditingVideo(true);
    setEditVideoError(null);
    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      
      let newCaptionObj: any = {};
      try {
        if (videoToEdit.caption) {
          newCaptionObj = typeof videoToEdit.caption === 'string' ? JSON.parse(videoToEdit.caption) : videoToEdit.caption;
        }
      } catch(e) {}
      newCaptionObj.captionText = editVideoCaptionText.trim();
      if (editVideoProductName.trim()) newCaptionObj.product_name = editVideoProductName.trim();
      if (editVideoProductPrice.trim() && !isNaN(Number(editVideoProductPrice))) newCaptionObj.product_price = Number(editVideoProductPrice);
      
      const newTagsArray = editVideoTags.split(',').flatMap(t => { const trimmed = t.trim(); return trimmed ? [trimmed] : []; });

      const res = await fetch(`/api/videos/${videoToEdit.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          caption: JSON.stringify(newCaptionObj),
          tags: newTagsArray,
          product_url: editVideoProductUrl || null,
          category_id: editVideoCategoryId || null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update video');
      }

      const { data } = await res.json();
      setVideos(prev => prev.map(v => v.id === videoToEdit.id ? { ...v, caption: data.caption, tags: data.tags, product_url: data.product_url, category_id: data.category_id } : v));
      setVideoToEdit(null);
    } catch(err: any) {
      setEditVideoError(err.message);
    } finally {
      setIsEditingVideo(false);
    }
  };

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

  // Active / Live Calculations
  const liveTotalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const liveTotalLikes = Object.values(engagementDetails.likesByVideo).reduce((sum, val) => sum + val, 0);
  const liveTotalSaves = Object.values(engagementDetails.savesByVideo).reduce((sum, val) => sum + val, 0);
  const liveTotalComments = Object.values(engagementDetails.commentsByVideo).reduce((sum, val) => sum + val, 0);
  const liveTotalEngagements = liveTotalLikes + liveTotalSaves + liveTotalComments;
  const liveEngagementRate = liveTotalViews > 0 
    ? parseFloat(((liveTotalEngagements / liveTotalViews) * 100).toFixed(1)) 
    : 0;
  const avgViewsPerVideo = videos.length > 0 ? Math.round(liveTotalViews / videos.length) : 0;

  // Render variables
  const totalViews = liveTotalViews;
  const totalLikes = liveTotalLikes;
  const totalSaves = liveTotalSaves;
  const totalComments = liveTotalComments;
  const totalEngagements = liveTotalEngagements;
  const engagementRate = liveEngagementRate;

  // Render list of videos
  const displayVideos = videos.map(v => {
    const parsedCaption = parseVideoProduct(v.caption);
    return {
        id: v.id,
        caption: parsedCaption.captionText || 'No description provided',
        views: v.views || 0,
        likes: engagementDetails.likesByVideo[v.id] || 0,
        comments: engagementDetails.commentsByVideo[v.id] || 0,
        saves: engagementDetails.savesByVideo[v.id] || 0,
        status: v.status || 'active',
        created_at: v.created_at,
        thumbnail_url: v.thumbnail_url || v.main_product_image_url
    };
  }).filter(v => v.caption.toLowerCase().includes(searchTerm.toLowerCase()));

  const topVideoByViews = displayVideos.length > 0 ? displayVideos.toSorted((a,b) => b.views - a.views)[0] : null;
  const topVideoByEngagement = displayVideos.length > 0 ? displayVideos.toSorted((a,b) => (b.likes+b.saves+b.comments) - (a.likes+a.saves+a.comments))[0] : null;

  // Active charts datasets based on mode
  const trendData = [
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

  const videosComparison = displayVideos.slice(0, 5).map(v => ({
    name: v.caption.substring(0, 15) + '...',
    Views: v.views,
    Likes: v.likes
  }));

  const finalVideoComparison = videosComparison.length > 0 ? videosComparison : [
    { name: 'Empty', Views: 0, Likes: 0 }
  ];

  const distributionData = [
    { name: 'Likes', value: totalLikes, color: '#ff5a36' },
    { name: 'Saved', value: totalSaves, color: '#facc15' },
    { name: 'Comments', value: totalComments, color: '#3897f0' },
  ];

  const hasStats = displayVideos.length > 0;

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white font-sans flex flex-col h-full bg-[#0c0c0e]">
      {/* Header BAR */}
      <div className="sticky top-0 z-20 bg-[#0c0c0e]/95 backdrop-blur-md pt-5 pb-0 px-0 border-b border-white/5">
        <div className="flex items-center justify-between px-4 pb-3">
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
        </div>

        {/* Main Tabs */}
        {!loading && profile && (profile.can_upload || profile.is_admin) && (
          <div className="flex px-4 gap-x-6 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'performance', label: 'Content Performance' },
              { id: 'insights', label: 'Audience Insights' }
            ].map(tab => (
              <button type="button"
                key={tab.id}
                onClick={() => setMainTab(tab.id as any)}
                className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  mainTab === tab.id 
                    ? 'border-[#ff5a36] text-white' 
                    : 'border-transparent text-zinc-400 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pt-5 px-4 pb-10">
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
            <button type="button" aria-label="Return" onClick={() => (window.history.state && window.history.state.idx > 0) ? navigate(-1) : navigate('/', { replace: true })} className="mt-8 px-6 py-2.5 bg-white text-black font-semibold rounded-xl text-sm transition-transform active:scale-95">
              Go Back
            </button>
          </div>
        ) : (
          <div className="gap-y-6 flex flex-col pb-10">
            {mainTab === 'overview' && (
              <>
                {/* Creator Mini Card */}
                <div className="p-4 bg-gradient-to-r from-[#17171e] to-[#151518] border border-white/5 rounded-[22px] flex items-center shadow-lg">
              <div className="size-[46px] rounded-full overflow-hidden bg-zinc-850 shrink-0 mr-3.5 border border-white/10 ring-2 ring-white/5 shadow-inner">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="size-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="size-full flex items-center justify-center text-white/50 bg-zinc-800 text-[14px] uppercase font-bold font-serif italic">
                    {profile?.username?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <span className="text-[14px] font-semibold text-white tracking-wide block truncate">
                  {profile?.username || 'Creator'}
                </span>
                <span className="text-[11.5px] font-medium text-zinc-400 tracking-wide lowercase block leading-tight">
                  @{profile?.username?.toLowerCase() || 'creator'} • {videos.length} Posts
                </span>
              </div>
              
              <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 text-[10.5px] font-bold rounded-xl tracking-wider uppercase shadow-[0_0_12px_rgba(99,102,241,0.1)] shrink-0 flex items-center gap-1 font-mono">
                <Sparkles className="size-3.5 animate-pulse" />
                Insight pro
              </div>
            </div>

            {/* Trending Topics & Hashtags */}
            <div className="flex flex-col gap-y-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[15.5px] font-bold text-white tracking-wide flex items-center gap-2">
                  <TrendingUp className="size-[18px] text-[#ff5a36]" />
                  Trending on Platform
                </h3>
                <button type="button" 
                  onClick={() => navigate('/trending')}
                  className="text-[12px] font-medium text-zinc-400 hover:text-white flex items-center transition-colors"
                >
                  View full list <ChevronRight className="size-3.5 ml-0.5" />
                </button>
              </div>
              <div className="flex gap-x-2.5 overflow-x-auto no-scrollbar pb-1">
                {trendingTags.map((tag, i) => (
                   <button type="button" 
                     key={i}
                     onClick={() => navigate(`/trending?tag=${encodeURIComponent(tag)}`)}
                     className="px-3.5 py-1.5 bg-[#131316] border border-white/5 rounded-full text-[12px] font-semibold text-white/90 whitespace-nowrap hover:bg-[#ff5a36]/10 hover:text-[#ff5a36] transition-colors border-white/10"
                   >
                     {tag.startsWith('#') ? tag : `#${tag.replace(/\s+/g, '')}`}
                   </button>
                ))}
              </div>
            </div>

            {/* Performance Ledger / Bento Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Views */}
              <div className="p-4 bg-[#131316] border border-white/5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-zinc-400 tracking-wide uppercase whitespace-nowrap">Total Views</span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shrink-0 ml-1">
                    <Eye className="size-4" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col">
                  <span className="text-[22px] font-bold font-sans text-white tracking-tight">
                    {totalViews >= 1000000 ? (totalViews / 1000000).toFixed(1) + 'M' : totalViews >= 1000 ? (totalViews / 1000).toFixed(1) + 'K' : totalViews}
                  </span>
                  {totalViews > 0 && (
                    <span className="text-[10.5px] font-medium text-emerald-400 mt-1 flex items-center gap-0.5 whitespace-nowrap">
                      <TrendingUp className="size-3" /> Growing audience
                    </span>
                  )}
                </div>
              </div>

              {/* Engagement Rate */}
              <div className="p-4 bg-[#131316] border border-white/5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-zinc-400 tracking-wide uppercase whitespace-nowrap">Engagement Rate</span>
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-400/10 shrink-0 ml-1">
                    <TrendingUp className="size-4" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col">
                  <span className="text-[22px] font-bold font-sans text-white tracking-tight">
                    {engagementRate}%
                  </span>
                  <span className="text-[10.5px] font-medium text-zinc-400 mt-1 flex items-center gap-0.5 whitespace-nowrap">
                    ✨ Industry benchmark is 3.5%
                  </span>
                </div>
              </div>

              {/* Avg Views Per Video */}
              <div className="p-4 bg-[#131316] border border-white/5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-zinc-400 tracking-wide uppercase whitespace-nowrap">Avg Views/Video</span>
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/10 shrink-0 ml-1">
                    <Play className="size-4" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col">
                  <span className="text-[22px] font-bold font-sans text-white tracking-tight">
                    {avgViewsPerVideo >= 1000000 ? (avgViewsPerVideo / 1000000).toFixed(1) + 'M' : avgViewsPerVideo >= 1000 ? (avgViewsPerVideo / 1000).toFixed(1) + 'K' : avgViewsPerVideo}
                  </span>
                  <span className="text-[10.5px] font-medium text-zinc-400 mt-1 flex items-center gap-0.5 whitespace-nowrap">
                    Average retention metric
                  </span>
                </div>
              </div>

              {/* Likes */}
              <div className="p-4 bg-[#131316] border border-white/5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-zinc-400 tracking-wide uppercase whitespace-nowrap">Total Likes</span>
                  <div className="p-1.5 rounded-lg bg-[#ff5a36]/10 text-[#ff5a36] border border-[#ff5a36]/10 shrink-0 ml-1">
                    <Heart className="size-4 fill-[#ff5a36]/10" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col">
                  <span className="text-[22px] font-bold font-sans text-white tracking-tight">
                    {totalLikes >= 1000000 ? (totalLikes / 1000000).toFixed(1) + 'M' : totalLikes >= 1000 ? (totalLikes / 1000).toFixed(1) + 'K' : totalLikes}
                  </span>
                  {totalLikes > 0 && (
                    <span className="text-[10.5px] font-medium text-[#ff5a36] mt-1 flex items-center gap-0.5 whitespace-nowrap">
                      <TrendingUp className="size-3" /> Higher engagement
                    </span>
                  )}
                </div>
              </div>

              {/* Saves */}
              <div className="p-4 bg-[#131316] border border-white/5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-zinc-400 tracking-wide uppercase whitespace-nowrap">Saved Videos</span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/10 shrink-0 ml-1">
                    <Bookmark className="size-4 fill-amber-500/10" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col">
                  <span className="text-[22px] font-bold font-sans text-white tracking-tight">
                    {totalSaves >= 1000000 ? (totalSaves / 1000000).toFixed(1) + 'M' : totalSaves >= 1000 ? (totalSaves / 1000).toFixed(1) + 'K' : totalSaves}
                  </span>
                  <span className="text-[10.5px] font-medium text-zinc-400 mt-1 flex items-center gap-0.5 whitespace-nowrap">
                    Organic bookmarks
                  </span>
                </div>
              </div>

              {/* Comments */}
              <div className="p-4 bg-[#131316] border border-white/5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-zinc-400 tracking-wide uppercase whitespace-nowrap">Total Comments</span>
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/10 shrink-0 ml-1">
                    <MessageSquare className="size-4" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col">
                  <span className="text-[22px] font-bold font-sans text-white tracking-tight">
                    {totalComments >= 1000000 ? (totalComments / 1000000).toFixed(1) + 'M' : totalComments >= 1000 ? (totalComments / 1000).toFixed(1) + 'K' : totalComments}
                  </span>
                  <span className="text-[10.5px] font-medium text-zinc-400 mt-1 flex items-center gap-0.5 whitespace-nowrap">
                    Community responses
                  </span>
                </div>
              </div>
            </div>

            <CreatorAnalytics videos={videos} engagementDetails={engagementDetails} />
            </>
          )}

          {mainTab === 'insights' && (
            <>
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
                      activeChartTab === 'trends' ? 'bg-[#ff5a36] text-white shadow-sm' : 'bg-transparent text-zinc-400 hover:text-white/80'
                    }`}
                  >
                    Audience growth
                  </button>
                  <button type="button" aria-label="button"  
                    onClick={() => setActiveChartTab('comparison')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      activeChartTab === 'comparison' ? 'bg-[#ff5a36] text-white shadow-sm' : 'bg-transparent text-zinc-400 hover:text-white/80'
                    }`}
                  >
                    Top videos comparison
                  </button>
                  <button type="button" aria-label="button"  
                    onClick={() => setActiveChartTab('distribution')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      activeChartTab === 'distribution' ? 'bg-[#ff5a36] text-white shadow-sm' : 'bg-transparent text-zinc-400 hover:text-white/80'
                    }`}
                  >
                    Action distribution
                  </button>
                </div>
              </div>

              {!hasStats ? (
                <div className="h-[210px] w-full flex flex-col items-center justify-center text-zinc-400 gap-y-2 border border-dashed border-white/5 rounded-2xl">
                   <Info className="size-8 opacity-40 text-zinc-400" strokeWidth={1.5} />
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
                            <stop offset="5%" stopColor="#ff5a36" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#ff5a36" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '10px' }} />
                        <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="Views" stroke="#ff5a36" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
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
                        <Bar dataKey="Likes" fill="#ff5a36" radius={[4, 4, 0, 0]} />
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
                            <span className="font-mono text-zinc-400 font-bold">{entry.value >= 1000 ? (entry.value / 1000).toFixed(1) + 'K' : entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Smart Real-time Insights generated from actual performance data */}
            {hasStats && topVideoByViews && topVideoByEngagement && (
              <div className="flex flex-col gap-y-3 mb-6">
                <h3 className="text-[15.5px] font-bold text-white tracking-wide mb-1.5">Top Video Analytics</h3>
                
                {/* Most Viewed */}
                <div 
                  className="bg-gradient-to-br from-[#101013] to-[#141417] border border-emerald-500/10 p-4 rounded-3xl shadow-sm flex items-start cursor-pointer transition-all active:scale-[0.99] hover:bg-white/[0.02]"
                  onClick={() => navigate(`/video/${topVideoByViews.id}`)}
                >
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl mr-3.5 shrink-0 shadow-sm">
                    <Eye className="size-[18px]" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0 pr-2 pt-0.5">
                    <h4 className="text-[12px] font-bold text-emerald-400 tracking-wide uppercase mb-0.5">Most Viewed Upload</h4>
                    <p className="text-[14px] text-white font-semibold truncate mb-1">
                      {topVideoByViews.caption}
                    </p>
                    <p className="text-[11.5px] text-zinc-400 leading-relaxed font-normal">
                      Generated <span className="font-bold text-white">{topVideoByViews.views >= 1000 ? (topVideoByViews.views/1000).toFixed(1)+`K` : topVideoByViews.views} plays</span>. 
                      Replicating this visual style or audio trend could yield similar reach.
                    </p>
                  </div>
                  <div className="w-[42px] h-[54px] rounded-lg overflow-hidden bg-zinc-900 border border-white/5 shrink-0 opacity-80 mt-0.5">
                    {topVideoByViews.thumbnail_url ? (
                      <img src={topVideoByViews.thumbnail_url} className="size-full object-cover" alt="Best Video" loading="lazy" decoding="async" />
                    ) : (
                      <div className="size-full flex items-center justify-center bg-zinc-800">
                        <Play className="size-3 text-zinc-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Most Engaged */}
                {topVideoByEngagement.id !== topVideoByViews.id && (
                  <div 
                    className="bg-gradient-to-br from-[#101013] to-[#141417] border border-[#ff5a36]/10 p-4 rounded-3xl shadow-sm flex items-start cursor-pointer transition-all active:scale-[0.99] hover:bg-white/[0.02]"
                    onClick={() => navigate(`/video/${topVideoByEngagement.id}`)}
                  >
                    <div className="p-2.5 bg-[#ff5a36]/10 border border-[#ff5a36]/20 text-[#ff5a36] rounded-xl mr-3.5 shrink-0 shadow-sm">
                      <Heart className="size-[18px] fill-[#ff5a36]/20" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0 pr-2 pt-0.5">
                      <h4 className="text-[12px] font-bold text-[#ff5a36] tracking-wide uppercase mb-0.5">Highest Engagement</h4>
                      <p className="text-[14px] text-white font-semibold truncate mb-1">
                        {topVideoByEngagement.caption}
                      </p>
                      <p className="text-[11.5px] text-zinc-400 leading-relaxed font-normal">
                        Driven by <span className="font-bold text-white">{topVideoByEngagement.likes} likes</span> and <span className="font-bold text-white">{topVideoByEngagement.saves} saves</span>. 
                        This audience actively connects with this formatted content.
                      </p>
                    </div>
                    <div className="w-[42px] h-[54px] rounded-lg overflow-hidden bg-zinc-900 border border-white/5 shrink-0 opacity-80 mt-0.5">
                      {topVideoByEngagement.thumbnail_url ? (
                        <img src={topVideoByEngagement.thumbnail_url} className="size-full object-cover" alt="Most Engaged" loading="lazy" decoding="async" />
                      ) : (
                        <div className="size-full flex items-center justify-center bg-zinc-800">
                          <Play className="size-3 text-zinc-400" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            </>
          )}

          {mainTab === 'performance' && (
            <>
            {/* Video List of uploads / performance list */}
            <div className="flex flex-col mb-6">
              <div className="flex items-center justify-between mb-4.5">
                <h3 className="text-[15.5px] font-bold text-white tracking-wide">Video List & Video Ledger</h3>
                <span className="text-[11px] font-medium text-zinc-400 font-mono">({displayVideos.length} Posts)</span>
              </div>

              {/* Search video list bar */}
              <div className="relative mb-4">
                 <Search className="size-4 text-zinc-501 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                 <input 
                   type="text" 
                   placeholder="Search video ledger..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-11 pr-5 py-3 bg-[#131316] border border-white/5 rounded-2xl text-[13.5px] text-white/90 placeholder-zinc-500 focus:outline-none focus:border-[#ff5a36] transition-colors"
                 />
              </div>

              {displayVideos.length === 0 ? (
                 <div className="py-16 text-center flex flex-col items-center justify-center bg-transparent mt-4">
                   <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-4">
                     <VideoIcon className="size-7 text-zinc-400" strokeWidth={1.5} />
                   </div>
                   <h3 className="text-[17px] font-bold text-white tracking-tight mb-1">No data available</h3>
                   <p className="text-[13px] text-zinc-400 max-w-[200px] mx-auto leading-relaxed">Upload content to see your performance metrics and insights.</p>
                 </div>
              ) : (
                 <div className="flex flex-col gap-y-3">
                   {displayVideos.map((video, index) => (
                     <div 
                       key={video.id || index}
                       onClick={() => navigate(`/video/${video.id}`)}
                       className={`p-3.5 bg-[#131316] border border-white/5 rounded-2xl flex items-center shadow-md transition-all hover:bg-white/5 cursor-pointer active:scale-[0.99]`}
                     >
                        {/* Thumbnail */}
                        <div className="w-[50px] h-[64px] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 shrink-0 mr-4 relative">
                          {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} alt="Video thumbnail" className="size-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="size-full flex items-center justify-center text-zinc-400 bg-zinc-805">
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
                        <div className="flex flex-col gap-2 shrink-0 pr-1">
                          <button 
                            className="bg-white/5 hover:bg-white/10 text-zinc-300 p-1.5 rounded-md transition-colors self-end"
                            onClick={(e) => handleEditVideoClick(e, video.id)}
                            title="Edit Video Options"
                          >
                            <svg className="size-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </button>
                          <div className="grid grid-cols-2 gap-x-3.5 gap-y-1 text-right">
                             <div className="flex items-center justify-end text-[11.5px] text-zinc-400 font-mono tracking-wide">
                                <Eye className="size-3.5 mr-1 text-zinc-400" strokeWidth={2} />
                                <span>{video.views >= 1000 ? (video.views/1000).toFixed(1) + 'K' : video.views}</span>
                             </div>
                             <div className="flex items-center justify-end text-[11.5px] text-zinc-400 font-mono tracking-wide">
                                <Heart className="size-3.5 mr-1 text-[#ff5a36] fill-[#ff5a36]/10" strokeWidth={2} />
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
                     </div>
                   ))}
                 </div>
              )}
            </div>
            </>
          )}
          </div>
        )}
      </div>

      {/* Edit Video Modal */}
      <AnimatePresence>
        {videoToEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0c0c0e]/80 backdrop-blur-md"
            onClick={() => !isEditingVideo && setVideoToEdit(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-white/10 p-6 rounded-3xl w-full max-w-[400px] shadow-2xl relative"
            >
              <button type="button" aria-label="Close"  
                onClick={() => setVideoToEdit(null)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-1.5"
                disabled={isEditingVideo}
              >
                <ChevronRight className="size-4 rotate-180" />
              </button>
              
              <h2 className="text-xl font-display font-semibold text-white mb-6">Edit Video</h2>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pb-2 pr-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Caption/Text</label>
                  <textarea 
                    value={editVideoCaptionText}
                    onChange={(e) => setEditVideoCaptionText(e.target.value)}
                    placeholder="Enter new caption..."
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors h-24 resize-none"
                  />
                  <div className="text-right text-xs text-zinc-400 mt-1">
                    {editVideoCaptionText.length} characters
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Product Name</label>
                  <input 
                    type="text"
                    value={editVideoProductName}
                    onChange={(e) => setEditVideoProductName(e.target.value)}
                    placeholder="Enter product name..."
                     className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Product Price</label>
                  <input 
                    type="number"
                    value={editVideoProductPrice}
                    onChange={(e) => setEditVideoProductPrice(e.target.value)}
                    placeholder="Enter product price..."
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Product URL</label>
                  <input 
                    type="text"
                    value={editVideoProductUrl}
                    onChange={(e) => setEditVideoProductUrl(e.target.value)}
                    placeholder="Enter product URL..."
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Category</label>
                  <select 
                    value={editVideoCategoryId}
                    onChange={(e) => setEditVideoCategoryId(e.target.value)}
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors appearance-none"
                  >
                    <option value="" disabled>Select category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Hashtags / Tags (comma separated)</label>
                  <textarea 
                    value={editVideoTags}
                    onChange={(e) => setEditVideoTags(e.target.value)}
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors h-20 resize-none font-mono text-sm leading-relaxed"
                  />
                </div>
                
                {editVideoError && (
                   <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-xs text-red-500 text-center font-medium">{editVideoError}</p>
                   </div>
                )}
              </div>
              
              <button type="button" aria-label="button" 
                onClick={handleSaveVideoEdit}
                disabled={isEditingVideo}
                className="w-full mt-6 py-3.5 bg-white hover:bg-zinc-200 text-black font-semibold font-sans text-sm rounded-xl transition-all flex items-center justify-center disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-white/5"
              >
                {isEditingVideo ? <RefreshCw className="size-5 animate-spin" /> : 'Save Changes'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
