import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GlobalBackButton } from '../components/GlobalBackButton';
import { extractStoreName } from '../utils/videoUtils';

export default function StoreFeed() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const title = decodeURIComponent(name || '');

  useEffect(() => {
    async function fetchStoreVideos() {
      try {
        const { data: allVideos, error: vpError } = await supabase
          .from('videos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100); // Fetch a batch to filter locally as matching exact URLs or domains might need pg search, but we just want matching store names

        if (vpError) throw vpError;
        
        const matchedVideos = (allVideos || []).filter(v => extractStoreName(v.product_url) === title);
        setVideos(matchedVideos);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStoreVideos();
  }, [title]);

  if (loading) {
    return (
      <div className="flex-1 w-full bg-bg-base text-text-primary flex flex-col h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-bg-base text-text-primary font-sans flex flex-col h-full selection:bg-white/20 pb-[calc(60px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-bg-base/80 backdrop-blur-md pt-6 pb-4 px-5 flex items-center">
        <GlobalBackButton className="p-2 -ml-2 bg-transparent hover:bg-surface-1 border-transparent" iconClassName="size-6" />
        <h2 className="text-[19px] font-semibold text-text-primary ml-2 tracking-wide truncate">{title}</h2>
      </div>
      
      <div className="px-5 pt-2 flex-1 overflow-y-auto no-scrollbar">
        {videos.length === 0 ? (
          <div className="py-20 text-center text-text-secondary">
            <p className="text-sm font-medium">No videos found for this store.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[2px] md:gap-1">
            {videos.map((item) => (
              <div 
                key={item.id} 
                onClick={() => navigate(`/video/${item.id}`)}
                className="aspect-[3/4] bg-surface-1 overflow-hidden relative group cursor-pointer"
              >
                {item.thumbnail_url || item.main_product_image_url ? (
                  <img src={item.thumbnail_url || item.main_product_image_url} alt="Video thumbnail" className="size-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="size-full flex items-center justify-center text-text-secondary bg-surface-2 text-xs">No img</div>
                )}
                <div className="absolute inset-0 bg-bg-base/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border border-brand-primary">
                  <Play className="size-8 fill-white/80 text-text-primary/80" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
