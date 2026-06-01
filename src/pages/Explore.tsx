import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchClick = (query: string) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    const controller = new AbortController();

    const search = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const req = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          signal: controller.signal
        });
        const { videos } = await req.json();
        
        if (videos) {
          setSearchResults(videos);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(search, 500);
    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [searchQuery]);

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white font-sans h-full flex flex-col">
      {/* Header & Search */}
      <div className="sticky top-0 z-20 bg-[#0c0c0e] pt-6 pb-4 px-5">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-[18px] text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search creators or products" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1c1c1e] text-white/90 placeholder-zinc-400 rounded-2xl pl-[42px] pr-4 py-3 text-[15px] tracking-wide border border-white/5 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-6 flex flex-col mt-2 px-5 gap-y-8">
        
        {searchQuery.trim() !== '' ? (
          <section>
            <h3 className="text-[15px] font-semibold text-white tracking-wide mb-3 flex items-center">
               Search Results 
               {isSearching && <Loader2 className="size-4 ml-2 animate-spin text-zinc-500" />}
            </h3>
            <div className="flex flex-col gap-y-3">
               {searchResults.length === 0 && !isSearching ? (
                 <p className="text-zinc-500 text-sm">No videos found.</p>
               ) : (
                 <div className="grid grid-cols-2 gap-3">
                 {searchResults.map((video) => (
                   <button type="button" aria-label="button" key={video.id} onClick={() => alert('Feed scroll to incoming')} className="relative aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden group">
                     {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.caption} className="size-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                     ) : (
                        <div className="size-full flex items-center justify-center text-zinc-700 bg-zinc-900">No Image</div>
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 text-left">
                        <p className="text-white text-xs line-clamp-2 mt-auto font-medium">{video.caption || 'No caption'}</p>
                        {video.profiles && <p className="text-zinc-400 text-[11px] mt-1">@{video.profiles.username}</p>}
                     </div>
                   </button>
                 ))}
                 </div>
               )}
            </div>
          </section>
        ) : (
          <>
            {/* Recent Searches */}
            <section>
              <h3 className="text-[15px] font-semibold text-white tracking-wide mb-3">Recent Searches</h3>
              <div className="flex flex-wrap gap-2.5">
                {["Glow serum", "Skincare", "Hair oil"].map((query, i) => (
                  <button type="button" aria-label="button"  key={i} onClick={() => handleSearchClick(query)} className="px-4 py-2 bg-[#1c1c1e] border border-white/5 rounded-xl text-[14px] text-white/80 font-medium tracking-wide hover:bg-white/5 transition-colors">
                    {query}
                  </button>
                ))}
              </div>
            </section>

            {/* Trending Searches */}
            <section>
              <h3 className="text-[15px] font-semibold text-white tracking-wide mb-3">Trending Searches</h3>
              <div className="flex flex-col gap-y-0 relative -mx-2">
                {[
                  "Vitamin C Serum",
                  "Korean Skincare",
                  "Hair Growth Oil",
                  "Makeup Tools",
                  "Wireless Earbuds"
                ].map((query, i) => (
                  <button type="button" aria-label="button"  key={i} onClick={() => handleSearchClick(query)} className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-white/[0.02] rounded-xl transition-colors cursor-pointer group text-left">
                    <div className="flex items-center gap-x-3">
                      <div className="size-[18px] flex items-center justify-center shrink-0">
                        <svg className="size-5 text-white/40 group-hover:text-white/70 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      </div>
                      <span className="text-[15px] text-white/90 font-medium tracking-wide">{query}</span>
                    </div>
                    <ChevronRight className="size-[18px] text-white/30 group-hover:text-white/60 transition-colors" />
                  </button>
                ))}
              </div>
            </section>

            {/* Popular Creators */}
            <section className="pb-8">
              <h3 className="text-[15px] font-semibold text-white tracking-wide mb-4">Popular Creators</h3>
              
              <div className="flex gap-x-4 overflow-x-auto pb-2 scrollbar-none snap-x pr-5 -mx-5 px-5">
                {[
                  { name: "Sia", img: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=200&auto=format&fit=crop" },
                  { name: "Mike", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop" },
                  { name: "Alina", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" },
                  { name: "Raj", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" }
                ].map((creator, i) => (
                  <button type="button" aria-label="button"  key={i} onClick={() => handleSearchClick(creator.name)} className="flex flex-col items-center shrink-0 snap-start bg-transparent border-none">
                    <div className="size-[72px] rounded-full overflow-hidden mb-2 bg-zinc-800">
                      <img src={creator.img} alt={creator.name} className="size-full object-cover" />
                    </div>
                    <span className="text-[14px] font-medium text-white/90 tracking-wide">{creator.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
