import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Video } from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoPlayerSkeleton } from '../components/VideoPlayerSkeleton';
import { Play, Menu, Search } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Link, useParams } from 'react-router-dom';
import { SEO } from '../components/SEO';

export default function Feed() {
  const { videoId } = useParams<{ videoId?: string }>();
  const [activeTab, setActiveTab] = useState<'for_you' | 'trending'>('for_you');
  
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [videos, setVideos] = useState<Video[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const PAGE_SIZE = 10;

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
    setCursor(null);
    setHasMore(true);
    fetchVideos(null);
  }, [activeTab, selectedCategory]);

  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore && cursor !== null) {
      fetchVideos(cursor);
    }
  }, [inView, hasMore, loading, loadingMore, cursor]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchVideos = async (currentCursor: string | null) => {
    if (!currentCursor) setLoading(true);
    else setLoadingMore(true);

    setError(null);
    
    // Cancel previous fetch if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let fetchedVideos: Video[] = [];
      if (videoId && !currentCursor) {
        // Fetch the specific video
        const { data: specVideo, error: specError } = await supabase
          .from('videos')
          .select(`
            *,
            categories (id, name),
            profiles (
              id,
              username,
              avatar_url,
              is_brand
            )
          `)
          .eq('status', 'active')
          .eq('id', videoId)
          .maybeSingle();

        if (specVideo && !specError && !controller.signal.aborted) {
          fetchedVideos.push(specVideo);
        }
      }

      // Fetch from API instead of direct Supabase query for feed to use Redis cache & cursor pagination
      const params = new URLSearchParams();
      params.append('tab', activeTab);
      params.append('limit', PAGE_SIZE.toString());
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (currentCursor) params.append('cursor', currentCursor);

      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`/api/feed?${params.toString()}`, {
        signal: controller.signal,
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`
        } : undefined
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch feed: ${await res.text()}`);
      }

      if (controller.signal.aborted) return;
      const { data, nextCursor } = await res.json();
      
      let combinedData = data || [];
      if (videoId && !currentCursor) {
         combinedData = combinedData.filter((v: any) => v.id !== videoId);
      }
      
      // Filter out any videos where status is not 'active' (published)
      combinedData = combinedData.filter((v: any) => v.status === 'active' || v.post_status === 'published');

      const combined = !currentCursor ? [...fetchedVideos, ...combinedData] : combinedData;
      
      if (!currentCursor) {
        setVideos(combined);
      } else {
        setVideos((prev) => {
          const existingIds = new Set(prev.map(v => v.id));
          const newVideos = combined.filter((v: any) => !existingIds.has(v.id));
          return [...prev, ...newVideos];
        });
      }
      
      setHasMore(!!nextCursor);
      setCursor(nextCursor);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message.includes('Failed to fetch')) {
        // Ignore aborts or unmount network cancellations
        return;
      }
      console.error('Error fetching videos:', err);
      if (!currentCursor) setError(err.message);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  if (loading && cursor === null && videos.length === 0) {
    return (
      <div className="h-[100dvh] bg-[#0c0c0e] relative overflow-hidden">
        {/* Top Header Skeleton */}
        <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none bg-gradient-to-b from-black/60 via-black/30 to-transparent pt-[env(safe-area-inset-top,40px)] pb-6">
          <div className="flex justify-between items-center px-4 mt-2">
            <div className="size-8 bg-white/10 rounded-full animate-pulse ml-1" />
            <div className="flex items-center gap-x-5">
              <div className="w-16 h-5 bg-white/10 rounded animate-pulse"></div>
              <div className="w-16 h-5 bg-white/10 rounded animate-pulse"></div>
            </div>
            <div className="size-8 bg-white/10 rounded-full animate-pulse mr-1" />
          </div>
          <div className="w-full mt-5 px-4 flex items-center gap-3">
            <div className="w-12 h-8 bg-white/10 rounded-full animate-pulse" />
            <div className="w-20 h-8 bg-white/10 rounded-full animate-pulse" />
            <div className="w-24 h-8 bg-white/10 rounded-full animate-pulse" />
            <div className="w-20 h-8 bg-white/10 rounded-full animate-pulse" />
          </div>
        </div>
        
        <VideoPlayerSkeleton className="h-full border-none" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-[#0c0c0e] px-4 text-center gap-y-6 font-sans">
        <p className="text-zinc-500 font-medium tracking-wide">Couldn't load feed</p>
        <button type="button" aria-label="button"  
          onClick={() => fetchVideos(null)}
          className="px-6 py-3 bg-white text-black rounded-full font-semibold active:scale-95 transition-transform"
        >
          Tap to retry
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-[#0c0c0e] px-6 text-center">
        <div className="size-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner">
          <Play className="size-8 text-white/30 ml-1.5" />
        </div>
        <p className="text-white/90 font-sans font-bold text-[18px] mb-2 tracking-tight">No published videos found</p>
        <p className="text-[14px] font-sans tracking-wide text-white/50 leading-relaxed max-w-[240px]">We couldn't find any active content right now. Check back later or adjust your filters.</p>
      </div>
    );
  }

  const activeVideo = videos[activeIndex];
  const activeVideoSchema = activeVideo ? {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: activeVideo.caption || 'Video on Aisles',
    description: activeVideo.caption || 'Discover and shop products through immersive video experiences.',
    thumbnailUrl: [
      activeVideo.thumbnail_url || 'https://aisles.app/og-image.jpg'
    ],
    uploadDate: activeVideo.created_at || new Date().toISOString(),
    contentUrl: activeVideo.video_url,
    duration: 'PT30S', // Default representation for short-form video
    creator: activeVideo.profiles?.username ? {
      '@type': 'Person',
      name: activeVideo.profiles.username,
      url: `https://aisles.app/creator/${activeVideo.profiles.username}`
    } : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Aisles',
      logo: {
        '@type': 'ImageObject',
        url: 'https://aisles.app/logo.png'
      }
    }
  } : undefined;

  return (
    <div className="relative w-full h-[100dvh] bg-[#0c0c0e] pb-0">
      {activeVideo && (
        <SEO 
          title={`${activeVideo.caption ? activeVideo.caption.substring(0, 50) + '...' : 'Aisles Video'} | Aisles`}
          description={activeVideo.caption || 'Watch this video on Aisles, the premier video commerce platform.'}
          image={activeVideo.thumbnail_url}
          type="video.other"
          url={`https://aisles.app/video/${activeVideo.id}`}
          structuredData={activeVideoSchema}
          breadcrumbs={[
             { name: 'Home', item: 'https://aisles.app' },
             { name: 'Explore', item: 'https://aisles.app/explore' },
             { name: 'Video', item: `https://aisles.app/video/${activeVideo.id}` }
          ]}
        />
      )}
      
      {/* Top Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none bg-gradient-to-b from-black/60 via-black/30 to-transparent pt-[env(safe-area-inset-top,40px)] pb-6">
        <div className="flex justify-between items-center px-4 pointer-events-auto mt-2">
          <button type="button" aria-label="button"  onClick={() => alert("Menu options coming soon")} className="p-2 text-white transition-colors active:scale-95 -ml-2">
            {/* Custom menu icon matching image */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <line x1="12" y1="6" x2="21" y2="6"></line>
               <line x1="8" y1="12" x2="21" y2="12"></line>
               <line x1="12" y1="18" x2="21" y2="18"></line>
               <circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none"></circle>
               <circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none"></circle>
            </svg>
          </button>
          
          <div className="flex items-center gap-x-5">
            <button type="button" aria-label="button" 
              onClick={() => setActiveTab('trending')}
              className={cn(
                "relative pb-1.5 font-sans text-[17px] transition-all",
                activeTab === 'trending' ? "text-white font-bold" : "text-white/60 font-semibold"
              )}
            >
              Trending
              {activeTab === 'trending' && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-[25%] right-[25%] h-[2.5px] bg-white rounded-full" />
              )}
            </button>
            
            <button type="button" aria-label="button" 
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
            <Search className="size-[24px]" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Categories Filter */}
        {categories.length > 0 && (
          <div className="w-full overflow-x-auto no-scrollbar mt-4 px-4 flex items-center gap-2 pointer-events-auto">
            <button type="button" aria-label="button"  
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all backdrop-blur-md border",
                selectedCategory === null 
                  ? "bg-white text-black border-white" 
                  : "bg-[#0c0c0e]/40 text-white/80 border-white/10 hover:bg-[#0c0c0e]/60 hover:text-white"
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button type="button" aria-label="button"  
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all backdrop-blur-md border",
                  selectedCategory === cat.id 
                    ? "bg-white text-black border-white" 
                    : "bg-[#0c0c0e]/40 text-white/80 border-white/10 hover:bg-[#0c0c0e]/60 hover:text-white"
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
        className="absolute inset-0 overflow-y-auto snap-y snap-mandatory no-scrollbar touch-pan-y" 
        dir="ltr"
      >
        {videos.map((video, index) => {
          return <VideoPlayer key={video.id} video={video} isActive={index === activeIndex} />;
        })}
        {hasMore && (
          <div ref={ref}>
            <VideoPlayerSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}
