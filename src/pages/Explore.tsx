import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchClick = (query: string) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', `%${searchQuery}%`)
          .limit(10);
        
        if (data) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white font-sans h-full flex flex-col">
      {/* Header & Search */}
      <div className="sticky top-0 z-20 bg-[#0c0c0e] pt-6 pb-4 px-5">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search creators or products" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1c1c1e] text-white/90 placeholder-zinc-400 rounded-2xl pl-[42px] pr-4 py-3 text-[15px] tracking-wide border border-white/5 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-6 flex flex-col mt-2 px-5 space-y-8">
        
        {searchQuery.trim() !== '' ? (
          <section>
            <h3 className="text-[15px] font-semibold text-white tracking-wide mb-3 flex items-center">
               Search Results 
               {isSearching && <Loader2 className="w-4 h-4 ml-2 animate-spin text-zinc-500" />}
            </h3>
            <div className="flex flex-col space-y-3">
               {searchResults.length === 0 && !isSearching ? (
                 <p className="text-zinc-500 text-sm">No creators found.</p>
               ) : (
                 searchResults.map((profile) => (
                   <button key={profile.id} onClick={() => alert('Creator profile coming soon')} className="w-full flex items-center p-3 bg-[#151518] hover:bg-white/5 rounded-xl transition-colors text-left border border-white/5">
                     <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 mr-4">
                       {profile.avatar_url ? (
                         <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-white/40">{profile.username?.charAt(0)}</div>
                       )}
                     </div>
                     <div className="flex-1">
                       <h4 className="font-semibold text-white text-[15px]">{profile.username}</h4>
                       {profile.bio && <p className="text-zinc-500 text-[13px] truncate whitespace-nowrap overflow-hidden max-w-[200px]">{profile.bio}</p>}
                     </div>
                   </button>
                 ))
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
                  <button key={i} onClick={() => handleSearchClick(query)} className="px-4 py-2 bg-[#1c1c1e] border border-white/5 rounded-xl text-[14px] text-white/80 font-medium tracking-wide hover:bg-white/5 transition-colors">
                    {query}
                  </button>
                ))}
              </div>
            </section>

            {/* Trending Searches */}
            <section>
              <h3 className="text-[15px] font-semibold text-white tracking-wide mb-3">Trending Searches</h3>
              <div className="flex flex-col space-y-0 relative -mx-2">
                {[
                  "Vitamin C Serum",
                  "Korean Skincare",
                  "Hair Growth Oil",
                  "Makeup Tools",
                  "Wireless Earbuds"
                ].map((query, i) => (
                  <button key={i} onClick={() => handleSearchClick(query)} className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-white/[0.02] rounded-xl transition-colors cursor-pointer group text-left">
                    <div className="flex items-center space-x-3">
                      <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      </div>
                      <span className="text-[15px] text-white/90 font-medium tracking-wide">{query}</span>
                    </div>
                    <ChevronRight className="w-[18px] h-[18px] text-white/30 group-hover:text-white/60 transition-colors" />
                  </button>
                ))}
              </div>
            </section>

            {/* Popular Creators */}
            <section className="pb-8">
              <h3 className="text-[15px] font-semibold text-white tracking-wide mb-4">Popular Creators</h3>
              
              <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-none snap-x pr-5 -mx-5 px-5">
                {[
                  { name: "Sia", img: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=200&auto=format&fit=crop" },
                  { name: "Mike", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop" },
                  { name: "Alina", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" },
                  { name: "Raj", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" }
                ].map((creator, i) => (
                  <button key={i} onClick={() => handleSearchClick(creator.name)} className="flex flex-col items-center shrink-0 snap-start bg-transparent border-none">
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden mb-2 bg-zinc-800">
                      <img src={creator.img} alt={creator.name} className="w-full h-full object-cover" />
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
