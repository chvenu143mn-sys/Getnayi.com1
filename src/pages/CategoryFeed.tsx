import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GlobalBackButton } from '../components/GlobalBackButton';

export default function CategoryFeed() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategoryVideos() {
      try {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', id)
          .single();

        if (catData) setCategory(catData);

        const { data: vpData, error: vpError } = await supabase
          .from('videos')
          .select('*')
          .eq('category_id', id)
          .order('created_at', { ascending: false });

        if (vpError) throw vpError;
        setVideos(vpData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchCategoryVideos();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 w-full bg-[#0c0c0e] text-white flex flex-col h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#ff5a36]" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white font-sans flex flex-col h-full selection:bg-white/20 pb-[calc(60px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0c0c0e]/80 backdrop-blur-md pt-6 pb-4 px-5 flex items-center">
        <GlobalBackButton className="p-2 -ml-2 bg-transparent hover:bg-white/5 border-transparent" fallbackPath="/explore" iconClassName="size-6" />
        <h2 className="text-[19px] font-semibold text-white ml-2 tracking-wide truncate">{category?.name || 'Category'}</h2>
      </div>
      
      <div className="px-5 pt-2 flex-1 overflow-y-auto no-scrollbar">
        {videos.length === 0 ? (
          <div className="py-20 text-center text-zinc-400">
            <p className="text-sm font-medium">No videos found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[2px] md:gap-1">
            {videos.map((item) => (
              <div 
                key={item.id} 
                onClick={() => navigate(`/video/${item.id}`)}
                className="aspect-[3/4] bg-zinc-900 overflow-hidden relative group cursor-pointer"
              >
                {item.thumbnail_url || item.main_product_image_url ? (
                  <img src={item.thumbnail_url || item.main_product_image_url} alt="Video thumbnail" className="size-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="size-full flex items-center justify-center text-zinc-400 bg-zinc-800 text-xs">No img</div>
                )}
                <div className="absolute inset-0 bg-[#0c0c0e]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border border-[#ff5a36]">
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
