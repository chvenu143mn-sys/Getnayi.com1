import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Video } from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import { Loader2, Play, Menu, Search } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Link, useParams } from 'react-router-dom';

export default function Feed() {
  const { videoId } = useParams<{ videoId?: string }>();
  const [activeTab, setActiveTab] = useState<'for_you' | 'trending'>('for_you');
  
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [videos, setVideos] = useState<Video[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const PAGE_SIZE = 3;

  const { ref, inView } = useInView({
    threshold: 0.1,
  });

  const feedRef = useRef<HTMLDivElement>(null);

  // Track active video based on scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPosition = container.scrollTop;
    const windowHeight = container.clientHeight;
    const currentIndex = Math.round(scrollPosition / windowHeight);
    
    if (currentIndex !== activeIndex) {
      setActiveIndex(currentIndex);
    }
  };

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('id, name').order('name');
      if (data) setCategories(data);
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    setVideos([]);
    setPage(0);
    setHasMore(true);
    fetchVideos(0);
  }, [activeTab, selectedCategory]);

  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore) {
      fetchVideos(page + 1);
    }
  }, [inView, hasMore, loading, loadingMore, page]);

  const fetchVideos = async (pageNumber: number) => {
    if (pageNumber === 0) setLoading(true);
    else setLoadingMore(true);

    setError(null);
    try {
      let fetchedVideos: Video[] = [];
      if (videoId && pageNumber === 0) {
        // Fetch the specific video
        const { data: specVideo, error: specError } = await supabase
          .from('videos')
          .select(`
            *,
            categories (id, name),
            profiles (
              id,
              username,
              avatar_url
            )
          `)
          .eq('id', videoId)
          .maybeSingle();

        if (specVideo && !specError) {
          fetchedVideos.push(specVideo);
        }
      }

      let query = supabase
        .from('videos')
        .select(`
          *,
          categories (id, name),
          profiles (
            id,
            username,
            avatar_url
          )
        `);

      if (videoId) {
        query = query.neq('id', videoId);
      }

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      if (activeTab === 'trending') {
        // Sort by views descending, nulls last
        query = query.order('views', { ascending: false, nullsFirst: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await query.range(from, to);

      if (error) throw error;
      
      if (data) {
        const combined = pageNumber === 0 ? [...fetchedVideos, ...data] : data;
        if (pageNumber === 0) {
          setVideos(combined);
        } else {
          setVideos((prev) => {
            // Check for duplicates before adding
            const existingIds = new Set(prev.map(v => v.id));
            const newVideos = combined.filter(v => !existingIds.has(v.id));
            return [...prev, ...newVideos];
          });
        }
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageNumber);
      }
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      if (pageNumber === 0) setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  if (loading && page === 0 && videos.length === 0) {
    return (
      <div className="h-[100dvh] bg-black relative">
        {/* Top Tabs Skeleton */}
        <div className="absolute top-12 left-0 right-0 flex justify-center space-x-6 z-10 px-4">
          <div className="w-16 h-4 bg-white/10 rounded animate-pulse"></div>
          <div className="w-20 h-4 bg-white/10 rounded animate-pulse"></div>
        </div>
        
        {/* Main Video Area Skeleton */}
        <div className="w-full h-full flex flex-col justify-end p-4 pb-[80px] relative overflow-hidden bg-black">
          {/* Side Actions Skeleton */}
          <div className="absolute right-3 bottom-[100px] flex flex-col items-center space-y-6 z-10">
            <div className="w-10 h-10 bg-white/5 rounded-full animate-pulse border-2 border-transparent"></div>
            <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse"></div>
            <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse"></div>
            <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse"></div>
          </div>

          {/* Bottom Info Skeleton */}
          <div className="space-y-4 w-3/4 z-10 mb-6">
            <div className="w-24 h-4 bg-white/5 rounded animate-pulse"></div>
            <div className="space-y-2">
              <div className="w-full h-3 bg-white/5 rounded animate-pulse"></div>
              <div className="w-4/5 h-3 bg-white/5 rounded animate-pulse"></div>
            </div>
            {/* Product Card Skeleton */}
            <div className="w-48 h-10 bg-white/5 rounded-lg animate-pulse mt-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-black px-4 text-center space-y-6 font-sans">
        <p className="text-zinc-500 font-medium tracking-wide">Couldn't load feed</p>
        <button 
          onClick={() => fetchVideos(0)}
          className="px-6 py-3 bg-white text-black rounded-full font-semibold active:scale-95 transition-transform"
        >
          Tap to retry
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-black px-6 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner">
          <Play className="w-8 h-8 text-white/30 ml-1.5" />
        </div>
        <p className="text-white/90 font-sans font-bold text-[18px] mb-2 tracking-tight">Your feed is empty</p>
        <p className="text-[14px] font-sans tracking-wide text-white/50 leading-relaxed max-w-[240px]">Be the first to share a video to get things started.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[100dvh] bg-black pb-0">
      
      {/* Top Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none bg-gradient-to-b from-black/60 via-black/30 to-transparent pt-[env(safe-area-inset-top,40px)] pb-6">
        <div className="flex justify-between items-center px-4 pointer-events-auto mt-2">
          <button onClick={() => alert("Menu options coming soon")} className="p-2 text-white transition-colors active:scale-95 -ml-2">
            {/* Custom menu icon matching image */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <line x1="12" y1="6" x2="21" y2="6"></line>
               <line x1="8" y1="12" x2="21" y2="12"></line>
               <line x1="12" y1="18" x2="21" y2="18"></line>
               <circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none"></circle>
               <circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none"></circle>
            </svg>
          </button>
          
          <div className="flex items-center space-x-5">
            <button
              onClick={() => setActiveTab('trending')}
              className={cn(
                "relative pb-1.5 font-sans text-[17px] transition-all",
                activeTab === 'trending' ? "text-white font-bold" : "text-white/60 font-semibold"
              )}
            >
              Following
              {activeTab === 'trending' && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-[25%] right-[25%] h-[2.5px] bg-white rounded-full" />
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('for_you')}
              className={cn(
                "relative pb-1.5 font-sans text-[17px] transition-all",
                activeTab === 'for_you' ? "text-white font-bold" : "text-white/60 font-semibold"
              )}
            >
              For You
              {activeTab === 'for_you' && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-[25%] right-[25%] h-[2.5px] bg-white rounded-full" />
              )}
            </button>
          </div>

          <Link to="/explore" className="p-2 text-white transition-colors active:scale-95 -mr-2">
            <Search className="w-[24px] h-[24px]" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Categories Filter */}
        {categories.length > 0 && (
          <div className="w-full overflow-x-auto no-scrollbar mt-4 px-4 flex items-center gap-2 pointer-events-auto">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all backdrop-blur-md border",
                selectedCategory === null 
                  ? "bg-white text-black border-white" 
                  : "bg-black/40 text-white/80 border-white/10 hover:bg-black/60 hover:text-white"
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all backdrop-blur-md border",
                  selectedCategory === cat.id 
                    ? "bg-white text-black border-white" 
                    : "bg-black/40 text-white/80 border-white/10 hover:bg-black/60 hover:text-white"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div 
        ref={feedRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar overscroll-y-none" 
        dir="ltr"
      >
        {videos.map((video, index) => (
          <VideoPlayer key={video.id} video={video} isActive={index === activeIndex} />
        ))}
        {hasMore && (
          <div ref={ref} className="w-full h-[100dvh] flex items-center justify-center shrink-0 snap-end pointer-events-none pb-20 bg-black">
            {loadingMore && <Loader2 className="w-6 h-6 text-white/30 animate-spin" />}
          </div>
        )}
      </div>
    </div>
  );
}
