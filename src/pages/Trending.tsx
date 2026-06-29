import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Play, Zap, Loader2, Navigation, MessageCircle, Heart, Bookmark, Share2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Video } from '../types';
import { parseVideoProduct } from '../utils/videoUtils';

import { GlobalBackButton } from '../components/GlobalBackButton';

export default function Trending() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTag = searchParams.get('tag');

  const [activeTag, setActiveTag] = useState<string>(initialTag || 'All');
  const [trendingVideos, setTrendingVideos] = useState<any[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>(["All", "#skincare", "#fashion", "#techgadgets", "Morning Routine", "OOTD", "GRWM", "#fitness"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('trending_metrics')
        .select('tag')
        .order('score', { ascending: false })
        .limit(8);
        
      if (data && data.length > 0) {
        setTrendingTags(["All", ...data.map(d => `#${d.tag}`)]);
      }
    } catch (err) {
      console.error('Error fetching tags', err);
    }
  };

  useEffect(() => {
    fetchTrendingVideos(activeTag);
  }, [activeTag]);

  const fetchTrendingVideos = async (tag: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('videos')
        .select(`
          *,
          profiles:user_id (id, username, avatar_url),
          likes(count),
          comments(count),
          saved_videos(count)
        `)
        .order('views', { ascending: false })
        .limit(20);

      // Simple tag filtering based on caption for demo purposes
      if (tag && tag !== 'All') {
        const searchTerm = tag.startsWith('#') ? tag : `#${tag.replace(/\s+/g, '')}`;
        query = query.ilike('caption', `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setTrendingVideos(data);
      } else {
        // Fallback: If tag filter fails or no data, just fetch top by views
        if (tag !== 'All') {
           const { data: fallbackData } = await supabase.from('videos').select('*, profiles:user_id(username, avatar_url)').order('views', {ascending: false}).limit(20);
           setTrendingVideos(fallbackData || []);
        }
      }
    } catch (e) {
      console.error("Error fetching trending videos:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-bg-base text-text-primary font-sans h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-bg-base/95 backdrop-blur-md pt-6 pb-3 px-5 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-x-3 mb-4">
          <GlobalBackButton className="p-2 -ml-2 hover:bg-surface-1 bg-transparent border-transparent" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-primary/10 shrink-0">
              <TrendingUp className="size-[18px] text-brand-primary" />
            </div>
            <h1 className="text-[19px] font-bold text-text-primary tracking-tight">
              Trending
            </h1>
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex gap-x-2.5 overflow-x-auto no-scrollbar pb-1 pointer-events-auto snap-x">
          {trendingTags.map((tag, i) => (
            <button type="button" 
              key={i}
              onClick={() => setActiveTag(tag)}
              className={`px-4 py-1.5 border snap-start shrink-0 rounded-full text-[13.5px] font-semibold whitespace-nowrap transition-all ${
                activeTag === tag 
                ? 'bg-white text-black border-white' 
                : 'bg-surface-2 border-border-subtle text-text-primary/80 hover:bg-surface-1'
              }`}
            >
              {tag.startsWith('#') || tag === 'All' ? tag : `#${tag.replace(/\s+/g, '')}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 pt-4 px-4 md:px-8 bg-bg-base">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 text-text-secondary animate-spin" />
          </div>
        ) : trendingVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
             <div className="size-16 rounded-full bg-surface-1 border border-border-subtle flex items-center justify-center mb-4">
                <Zap className="size-8 text-text-secondary" />
             </div>
             <p className="text-[15px] font-bold text-text-primary mb-1">No viral videos yet</p>
             <p className="text-[13px] text-text-secondary w-2/3">Try checking another trending hashtag or topic.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:grid-cols-4 md:max-w-none max-w-lg mx-auto">
            {trendingVideos.map((video, idx) => {
              let textToShow = video.caption || 'No description';
              try {
                if (video.caption && (video.caption.startsWith('{') || video.caption.startsWith('['))) {
                  const parsed = JSON.parse(video.caption);
                  textToShow = parsed.product_name || parsed.captionText || video.caption;
                }
              } catch(e) {}

              return (
                <div 
                  key={video.id} 
                  onClick={() => navigate(`/video/${video.id}`)}
                  className="bg-surface-1 border border-border-subtle rounded-2xl overflow-hidden cursor-pointer group hover:border-border-subtle transition-all shadow-md relative"
                >
                  <div className="absolute top-2 left-2 z-10 font-bold font-mono text-[22px] tracking-tighter opacity-80"
                    style={{
                      WebkitTextStroke: '1px rgba(255,255,255,0.2)',
                      color: idx < 3 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.2)',
                      textShadow: idx < 3 ? '0 2px 10px rgba(0,0,0,0.5)' : 'none'
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div className="aspect-[3/4] bg-surface-1 relative">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} className="size-full object-cover opacity-85 group-hover:opacity-100 transition-opacity" alt="thumbnail" loading="lazy" decoding="async" />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <Play className="size-8 text-text-primary/10" shrink-0 />
                      </div>
                    )}
                    
                    {/* Dark gradient for text overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/30 to-transparent flex flex-col justify-end p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="size-5 rounded-full overflow-hidden bg-surface-2 border border-white/20">
                          {video.profiles?.avatar_url ? (
                            <img src={video.profiles.avatar_url} className="size-full object-cover" alt="creator" loading="lazy" decoding="async" />
                          ) : (
                            <div className="size-full flex justify-center items-center text-[8px] bg-indigo-500 font-bold uppercase">{video.profiles?.username?.[0] || 'C'}</div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-text-primary/90 drop-shadow">@{video.profiles?.username}</span>
                      </div>
                      
                      <p className="text-[12.5px] font-medium text-text-primary line-clamp-2 leading-tight drop-shadow-md">
                        {textToShow}
                      </p>
                    </div>
                  </div>
                  
                  {/* Subtle metrics bar */}
                  <div className="px-3 py-2.5 flex items-center justify-between border-t border-border-subtle bg-surface-1">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-text-secondary">
                      <Play className="size-[11px]" />
                      {video.views >= 1000 ? (video.views/1000).toFixed(1) + 'K' : (video.views || 0)}
                    </div>
                    {video.likes && video.likes[0] && (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-text-secondary">
                        <Heart className="size-[11px]" />
                        {video.likes[0].count}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
