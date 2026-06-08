import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Loader2, Bookmark, Play, ShoppingBag, ExternalLink, ChevronRight, Video as VideoIcon, FolderPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Video, Profile } from '../types';
import { parseVideoProduct } from '../utils/videoUtils';

const tabs = ['Products', 'Videos', 'Creators', 'Collections'];

import { GlobalBackButton } from '../components/GlobalBackButton';

export default function Saved() {
  const [activeTab, setActiveTab] = useState('Products');
  const navigate = useNavigate();
  const { user } = useAuth();

  

  const [savedVideos, setSavedVideos] = useState<any[]>([]);
  const [followedCreators, setFollowedCreators] = useState<Profile[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [selectedSavedVideoId, setSelectedSavedVideoId] = useState<string | null>(null);
  const [savingToCollection, setSavingToCollection] = useState(false);

  const openCollectionModal = (savedVideoId: string) => {
    setSelectedSavedVideoId(savedVideoId);
    setCollectionModalOpen(true);
  };

  useEffect(() => {
    if (user) {
      fetchSavedData();
    }
  }, [user]);

  const fetchSavedData = async () => {
    setLoading(true);
    try {
      // 1. Fetch saved videos (joining video and corresponding profiles)
      const { data: savedV, error: errV } = await supabase
        .from('saved_videos')
        .select(`
          id,
          video_id,
          video:videos (
            *,
            profiles (
              id,
              username,
              avatar_url,
              bio,
              is_brand
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (errV) console.warn("Error fetching saved videos:", errV);
      if (savedV) {
        setSavedVideos(savedV.filter(item => item.video !== null));
      }

      // 2. Fetch collections
      const { data: coll, error: errC } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (errC) console.warn("Error fetching collections:", errC);
      if (coll) {
        setCollections(coll);
      }

      // 3. Fetch followed creators
      const { data: followsData, error: errF } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id);

      if (errF) console.warn("Error fetching follows:", errF);
      
      if (followsData && followsData.length > 0) {
        const creatorIds = followsData.map(f => f.following_id);
        const { data: profiles, error: errP } = await supabase
          .from('public_profiles')
          .select('*')
          .in('id', creatorIds);

        if (errP) console.warn("Error fetching followed profiles:", errP);
        if (profiles) {
          setFollowedCreators(profiles);
        }
      } else {
        setFollowedCreators([]);
      }
    } catch (err) {
      console.error('Error fetching saved details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract products from saved videos dynamically
  const products = savedVideos && savedVideos.length > 0
    ? savedVideos
        .filter(sv => sv.video && (sv.video.product_url || sv.video.main_product_image_url))
        .map(sv => {
          const video = sv.video;
          const parsed = parseVideoProduct(video.caption);
          const productName = parsed.productName || 'Linked Product';
          const productPriceText = parsed.productPrice ? `₹${parsed.productPrice.toLocaleString('en-IN')}` : (video.is_verified_real ? 'Verified authentic' : 'Linked product');
          
          return {
            savedVideoId: sv.id,
            id: video.id,
            name: productName,
            price: productPriceText,
            image: video.main_product_image_url || video.thumbnail_url || 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=400&q=80',
            url: video.product_url,
            creator: video.profiles?.username || 'Creator'
          };
        })
    : [];

  const handleCreateCollection = async () => {
    const name = window.prompt("Enter collection name");
    if (name) {
      try {
        if (!user) {
          alert("You must be logged in to create a collection.");
          return;
        }
        const { data, error } = await supabase.from('collections').insert({ name, user_id: user.id }).select().single();
        if (error) {
          console.error(error);
          alert("Failed to create collection.");
        } else {
          fetchSavedData();
          if (selectedSavedVideoId && data) {
            handleAddToCollection(data.id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAddToCollection = async (collectionId: string) => {
    if (!selectedSavedVideoId) return;
    setSavingToCollection(true);
    try {
      const { error } = await supabase.from('saved_videos').update({ collection_id: collectionId }).eq('id', selectedSavedVideoId);
      if (error) throw error;
      setCollectionModalOpen(false);
      setSelectedSavedVideoId(null);
      fetchSavedData();
    } catch(err) {
      console.error(err);
      alert("Failed to add to collection");
    } finally {
      setSavingToCollection(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white font-sans flex flex-col h-full bg-[#0c0c0e]">
      {/* Header Tabs */}
      <div className="sticky top-0 z-20 bg-[#0c0c0e] pt-6 pb-1">
        <div className="flex items-center px-4 mb-2">
            <GlobalBackButton className="p-2 -ml-2 bg-transparent hover:bg-white/5 border-transparent" />
            <h2 className="text-[17px] font-semibold text-white ml-2 tracking-wide">Saved Items</h2>
        </div>

        <div className="flex px-5 gap-x-7 overflow-x-auto scrollbar-none pb-3 border-b border-white/5">
          {tabs.map((tab) => (
            <button type="button" aria-label="button" 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`relative pb-2 text-[15px] font-medium tracking-wide whitespace-nowrap transition-colors ${
                 activeTab === tab ? 'text-white' : 'text-zinc-500 hover:text-white/80'
               }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabBadgeSaved"
                  className="absolute bottom-[-2px] left-0 right-0 h-[3px] bg-[#ef2950] rounded-t-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pt-5 px-5">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-y-3">
            <Loader2 className="size-8 animate-spin text-[#ef2950]" />
            <p className="text-sm font-medium">Loading saved items...</p>
          </div>
        ) : (
          <div>
            {/* Products Tab */}
            {activeTab === 'Products' && (
              <div>
                {products.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500 flex flex-col items-center">
                    <ShoppingBag className="size-12 text-zinc-700 mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium">No saved products yet.</p>
                    <p className="text-xs text-zinc-600 mt-1">Bookmark review videos to save their products.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5 mb-6">
                    {products.map((product, idx) => (
                      <div key={`${product.id}-${idx}`} className="flex flex-col bg-[#151518] border border-white/5 rounded-2xl overflow-hidden shadow-lg group relative">
                        <button type="button" aria-label="button"  
                          onClick={(e) => { e.stopPropagation(); openCollectionModal(product.savedVideoId as string); }}
                          className="absolute top-2 right-2 bg-[#0c0c0e]/60 p-1.5 rounded-full z-10 hover:bg-[#0c0c0e]/80 transition-colors"
                        >
                          <FolderPlus className="size-4 text-white" />
                        </button>
                        <div className="w-full aspect-square overflow-hidden bg-zinc-900 relative">
                          <img src={product.image} alt={product.name} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-[#0c0c0e]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a 
                              href={product.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2.5 bg-[#ef2950] text-white rounded-full hover:bg-[#ff3b61] active:scale-95 transition-all shadow-lg"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                          </div>
                        </div>
                        <div className="p-3.5 flex flex-col flex-1">
                           <h4 className="text-[14px] font-semibold text-white truncate tracking-tight">{product.name}</h4>
                           <span className="text-[11px] font-medium text-zinc-500 mt-0.5">by @{product.creator.toLowerCase()}</span>
                           <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5">
                             <span className="text-[12px] font-semibold text-[#ef2950] bg-[#ef2950]/10 px-2 py-0.5 rounded-md">{product.price}</span>
                             <button type="button" aria-label="button"  onClick={() => navigate(`/video/${product.id}`)} className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-0.5">
                               Watch <ChevronRight className="size-3" />
                             </button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Videos Tab */}
            {activeTab === 'Videos' && (
              <div>
                {savedVideos.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500 flex flex-col items-center">
                    <VideoIcon className="size-12 text-zinc-700 mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium">No saved videos yet.</p>
                    <p className="text-xs text-zinc-600 mt-1">Videos you bookmark from the home feed will show here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 mb-6">
                    {savedVideos.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => navigate(`/video/${item.video.id}`)}
                        className="aspect-[3/4] bg-zinc-900 overflow-hidden relative rounded-xl border border-white/5 group cursor-pointer"
                      >
                        <button type="button" aria-label="button"  
                          onClick={(e) => { e.stopPropagation(); openCollectionModal(item.id); }}
                          className="absolute top-1 right-1 bg-[#0c0c0e]/60 p-1.5 rounded-full z-10 hover:bg-[#0c0c0e]/80 transition-colors"
                        >
                          <FolderPlus className="size-3.5 text-white" />
                        </button>
                        {item.video.thumbnail_url || item.video.main_product_image_url ? (
                          <img src={item.video.thumbnail_url || item.video.main_product_image_url} alt="Video thumbnail" className="size-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center bg-zinc-800 text-zinc-600">No Image</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-85 pointer-events-none" />
                        <div className="absolute bottom-2 left-2 flex items-center shadow-sm">
                          <Play className="size-3.5 fill-white text-white opacity-90 mr-1" />
                          <span className="text-white text-[12px] font-bold tracking-wide">
                            {item.video.views > 999 ? (item.video.views / 1000).toFixed(1) + 'K' : item.video.views || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Creators Tab */}
            {activeTab === 'Creators' && (
              <div>
                {followedCreators.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500 flex flex-col items-center">
                    <svg className="size-12 text-zinc-700 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>
                    <p className="text-sm font-medium">No followed creators yet.</p>
                    <p className="text-xs text-zinc-600 mt-1">Creators you follow will appear here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-y-3 mb-6">
                    {followedCreators.map((profile) => (
                      <button type="button" aria-label="button"  
                        key={profile.id} 
                        onClick={() => navigate(`/profile`)} 
                        className="w-full flex items-center p-4 bg-[#151518] hover:bg-white/5 rounded-2xl transition-all text-left border border-white/5 shadow-md"
                      >
                        <div className="size-[50px] rounded-full overflow-hidden bg-zinc-850 shrink-0 mr-4 border border-white/10">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.username} className="size-full object-cover" />
                          ) : (
                            <div className="size-full flex items-center justify-center text-white/40 bg-zinc-800 text-lg uppercase font-semibold">
                              {profile.username?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white text-[15px] tracking-tight">{profile.username}</h4>
                          {profile.bio && <p className="text-zinc-500 text-[13px] truncate whitespace-nowrap overflow-hidden pr-2 mt-0.5">{profile.bio}</p>}
                        </div>
                        <ChevronRight className="size-5 text-zinc-600 group-hover:text-white transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Collections Tab */}
            {activeTab === 'Collections' && (
              <div>
                <div className="grid grid-cols-2 gap-3.5 mb-6">
                  {collections.map((collection) => (
                    <div 
                      key={collection.id} 
                      className="flex flex-col cursor-pointer group"
                      onClick={() => navigate(`/collection/${collection.id}`)}
                    >
                      <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 shadow-md bg-zinc-900 border-b-0 rounded-b-none relative">
                        {collection.image_url ? (
                          <img src={collection.image_url} alt={collection.name} className="size-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center bg-[#151518] text-zinc-600">
                             <Bookmark className="size-8 text-zinc-700" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="bg-[#151518] border border-white/5 border-t-0 p-3.5 pt-2 rounded-b-2xl -mt-[11px] shadow-lg flex-1">
                         <h4 className="text-[14px] font-semibold text-white truncate tracking-tight">{collection.name}</h4>
                         <span className="text-[11px] font-medium text-zinc-500 block mt-0.5">Collection</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* New Collection Button */}
                <button type="button" aria-label="button"  
                  onClick={handleCreateCollection}
                  className="w-full flex items-center justify-center gap-x-2 bg-[#151518] border border-white/5 text-white/90 font-medium text-[15px] py-4 rounded-xl hover:bg-white/5 transition-all active:scale-[0.98] mb-8 shadow-sm"
                >
                  <Plus className="size-4 text-white/70" />
                  <span>New Collection</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collection Selection Modal */}
      <AnimatePresence>
        {collectionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0c0c0e]/60 backdrop-blur-sm flex justify-center items-end sm:items-center sm:p-4"
            onClick={() => setCollectionModalOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#0c0c0e] w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 pb-safe max-h-[85vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 mt-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Save to Collection</h3>
                <button type="button" aria-label="button"  
                  onClick={() => setCollectionModalOpen(false)}
                  className="p-2 -mr-2 bg-white/5 rounded-full hover:bg-white/10"
                >
                  <X className="size-5 text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pb-6 gap-y-3 mt-2">
                <button type="button" aria-label="button" 
                  onClick={() => {
                    handleCreateCollection();
                  }}
                  className="w-full flex items-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors border border-white/10 border-dashed"
                >
                  <div className="size-12 rounded-xl bg-[#ef2950]/20 flex items-center justify-center mr-4">
                    <Plus className="size-6 text-[#ef2950]" />
                  </div>
                  <span className="font-semibold text-white/90">Create New Collection</span>
                </button>

                {collections.map(col => (
                  <button type="button" aria-label="button" 
                    key={col.id}
                    onClick={() => handleAddToCollection(col.id)}
                    disabled={savingToCollection}
                    className="w-full flex items-center p-3 bg-[#151518] hover:bg-white/5 border border-white/5 rounded-2xl transition-colors disabled:opacity-50"
                  >
                    <div className="size-14 rounded-xl overflow-hidden bg-zinc-900 border border-white/5 shrink-0">
                      {col.image_url ? (
                        <img src={col.image_url} alt={col.name} className="size-full object-cover" />
                      ) : (
                        <div className="size-full flex items-center justify-center">
                          <Bookmark className="size-5 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 ml-4 text-left">
                      <h4 className="font-semibold text-white tracking-tight">{col.name}</h4>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
