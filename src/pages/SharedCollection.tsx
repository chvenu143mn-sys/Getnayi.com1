import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SharedCollection() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const name = searchParams.get('n') || 'Shared Collection';
  const vParam = searchParams.get('v');
  const videoIds = vParam ? vParam.split(',') : [];

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSharedVideos() {
      if (videoIds.length === 0) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('status', 'active')
          .in('id', videoIds);

        if (error) throw error;
        
        // Sort videos based on the order in the videoIds array to preserve the share order
        const sortedData = (data || []).toSorted(
          (a, b) => videoIds.indexOf(a.id) - videoIds.indexOf(b.id)
        );
        
        setVideos(sortedData);
      } catch (err) {
        console.error("Error fetching shared collection:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSharedVideos();
  }, [vParam]);

  if (loading) {
    return (
      <div className="flex-1 w-full bg-[#0c0c0e] text-white flex flex-col h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#ef2950]" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white font-sans flex flex-col h-full selection:bg-white/20 pb-[calc(60px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0c0c0e]/80 backdrop-blur-md pt-6 pb-4 px-5 flex items-center">
        <button type="button" aria-label="button"  onClick={() => navigate(-1)} className="p-2 -ml-2 text-white/90 hover:text-white transition-colors">
          <ArrowLeft className="size-6" />
        </button>
        <div className="ml-2 flex flex-col">
          <h2 className="text-[19px] font-semibold text-white tracking-wide truncate">{name}</h2>
          <span className="text-xs text-zinc-400 font-medium">{videos.length} videos</span>
        </div>
      </div>
      
      <div className="px-5 pt-2 flex-1 overflow-y-auto no-scrollbar">
        {videos.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <p className="text-sm font-medium">No videos found in this collection link.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px]">
            {videos.map((video) => (
              <div 
                key={video.id} 
                onClick={() => navigate(`/video/${video.id}`)}
                className="aspect-[3/4] bg-zinc-900 overflow-hidden relative group cursor-pointer"
              >
                {video.thumbnail_url || video.main_product_image_url ? (
                  <img src={video.thumbnail_url || video.main_product_image_url} alt="Video thumbnail" className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center text-zinc-600 bg-zinc-800 text-xs">No img</div>
                )}
                <div className="absolute inset-0 bg-[#0c0c0e]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="size-8 fill-white/80 text-white/80" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
