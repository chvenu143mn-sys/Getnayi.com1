import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Share2, Play, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { GlobalBackButton } from '../components/GlobalBackButton';

export default function Collection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const MAX_SHARE = 15;

  useEffect(() => {
    async function fetchCollection() {
      try {
        const { data: cols, error: colError } = await supabase
          .from('collections')
          .select('*')
          .eq('id', id)
          .single();
          
        if (colError) throw colError;
        setCollection(cols);

        const { data: savedItems, error: savedError } = await supabase
          .from('saved_videos')
          .select('*, video:video_id(*)')
          .eq('collection_id', id);

        if (savedError) throw savedError;
        
        // Filter out any items where video might be missing
        const validVideos = (savedItems || []).filter(item => item.video).map(item => ({
          ...item,
          video: item.video
        }));
        
        setVideos(validVideos);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchCollection();
  }, [id]);

  const toggleSelect = (videoId: string) => {
    setSelectedVideos(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      }
      if (prev.length >= MAX_SHARE) {
        alert(`You can select up to ${MAX_SHARE} videos to share.`);
        return prev;
      }
      return [...prev, videoId];
    });
  };

  const handleShare = async () => {
    if (selectedVideos.length === 0) {
      alert("Select at least one video to share!");
      return;
    }
    
    const baseUrl = window.location.origin;
    const longRelativeUrl = `/shared-collection?n=${encodeURIComponent(collection.name)}&v=${selectedVideos.join(',')}`;
    let shareUrl = `${baseUrl}${longRelativeUrl}`;
    
    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ longUrl: longRelativeUrl })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.shortUrl) {
          shareUrl = `${baseUrl}${data.shortUrl}`;
        }
      }
    } catch (err) {
      console.warn("Failed to shorten url", err);
    }

    const shareData: any = {
      title: collection.name,
      text: `Check out ${collection.name} on Getnayi!`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        // Try passing the first video's thumbnail as a native file
        const firstVideo = videos.find(v => v.video.id === selectedVideos[0]);
        const imageUrl = firstVideo?.video?.thumbnail_url || firstVideo?.video?.main_product_image_url;
        
        if (imageUrl) {
          try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'thumbnail.jpg', { type: blob.type || 'image/jpeg' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              shareData.files = [file];
            }
          } catch (e) {
            console.warn("Could not fetch thumbnail for direct share:", e);
          }
        }

        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
    
    setShareModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex-1 w-full bg-[#0c0c0e] text-white flex flex-col h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#ef2950]" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex-1 w-full bg-[#0c0c0e] text-white flex flex-col h-full items-center justify-center">
        <p>Collection not found.</p>
        <button type="button" aria-label="button"  onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/', { replace: true })} className="mt-4 px-4 py-2 bg-white/10 rounded-lg">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white font-sans flex flex-col h-full selection:bg-white/20 pb-[calc(60px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0c0c0e]/80 backdrop-blur-md pt-6 pb-4 px-5 flex items-center justify-between">
        <div className="flex items-center">
          <GlobalBackButton className="p-2 -ml-2 bg-transparent hover:bg-white/5 border-transparent" fallbackPath="/saved" iconClassName="size-6" />
          <h2 className="text-[19px] font-semibold text-white ml-2 tracking-wide">{collection.name}</h2>
        </div>
        <button type="button" aria-label="button"  
          onClick={() => {
            setSelectedVideos(videos.slice(0, MAX_SHARE).map(v => v.video.id));
            setShareModalOpen(true);
          }}
          className="p-2 -mr-2 text-white/90 hover:text-white transition-colors bg-white/10 rounded-full"
        >
          <Share2 className="size-5" />
        </button>
      </div>
      
      <div className="px-5 pt-2 flex-1 overflow-y-auto no-scrollbar">
        {videos.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <p className="text-sm font-medium">This collection is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px]">
            {videos.map((item) => (
              <div 
                key={item.id} 
                onClick={() => navigate(`/video/${item.video.id}`)}
                className="aspect-[3/4] bg-zinc-900 overflow-hidden relative group cursor-pointer"
              >
                {item.video.thumbnail_url || item.video.main_product_image_url ? (
                  <img src={item.video.thumbnail_url || item.video.main_product_image_url} alt="Video thumbnail" className="size-full object-cover" />
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

      {/* Share Modal */}
      <AnimatePresence>
        {shareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0c0c0e]/80 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => setShareModalOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#151518] w-full max-w-md mx-auto rounded-t-3xl border-t border-white/10 p-6 pb-safe max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold tracking-tight">Share Collection</h3>
                <span className="text-sm text-zinc-400 font-medium">{selectedVideos.length}/{MAX_SHARE} max</span>
              </div>
              <p className="text-sm text-zinc-400 mb-5 leading-relaxed">Select up to {MAX_SHARE} videos you want to include in the shareable link.</p>
              
              <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-3 gap-2 mb-6">
                {videos.map((item) => {
                  const isSelected = selectedVideos.includes(item.video.id);
                  return (
                    <div 
                      key={item.video.id} 
                      onClick={() => toggleSelect(item.video.id)}
                      className={`aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden relative cursor-pointer border-2 transition-colors ${isSelected ? 'border-[#ef2950]' : 'border-transparent'}`}
                    >
                      {item.video.thumbnail_url || item.video.main_product_image_url ? (
                        <img src={item.video.thumbnail_url || item.video.main_product_image_url} className="size-full object-cover"  alt="" />
                      ) : (
                        <div className="size-full bg-zinc-800" />
                      )}
                      
                      <div className={`absolute top-2 right-2 size-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[#ef2950] bg-[#ef2950]' : 'border-white/50 bg-[#0c0c0e]/20'}`}>
                        {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex gap-x-3">
                <button type="button" aria-label="button"  
                  onClick={() => setShareModalOpen(false)}
                  className="flex-1 py-3.5 rounded-xl font-semibold bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button type="button" aria-label="button"  
                  onClick={handleShare}
                  className="flex-1 py-3.5 rounded-xl font-semibold bg-[#ef2950] hover:bg-[#ff3b61] text-white transition-colors"
                >
                  Create Link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
