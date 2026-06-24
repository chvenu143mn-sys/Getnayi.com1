import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  X,
  Play,
  Heart,
  Bookmark,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GlobalBackButton } from "../components/GlobalBackButton";

// --- SIMPLIFIED AND INTENTIONAL EXPLORE PAGE DATASETS ---

const categoryChips = [
  { id: "all", name: "All Categories" },
  { id: "tech", name: "Tech" },
  { id: "fashion", name: "Fashion" },
  { id: "beauty", name: "Beauty" },
  { id: "fitness", name: "Fitness" },
  { id: "home", name: "Home" },
  { id: "study", name: "Study" },
  { id: "travel", name: "Travel" }
];

// SECTION 2: FOR YOU - Two-column product discovery grid items
const initialForYouProducts = [
  {
    id: "fy-1",
    name: "Nothing Ear (2) Transparent ANC Earbuds",
    price: "₹8,999",
    category: "tech",
    image: "https://picsum.photos/seed/nothingear/400/500",
    creator: "TechGamer",
    creatorAvatar: "https://i.pravatar.cc/100?u=tech1",
    saves: "4.2k",
    trustScore: "98% Trust",
    verified: true
  },
  {
    id: "fy-2",
    name: "Cosmic Byte Mechanical Backlit Keyboard",
    price: "₹2,499",
    category: "tech",
    image: "https://picsum.photos/seed/cosmic/400/500",
    creator: "HardwareHub",
    creatorAvatar: "https://i.pravatar.cc/100?u=hardware",
    saves: "2.8k",
    trustScore: "94% Trust",
    verified: true
  },
  {
    id: "fy-3",
    name: "Minimalist Vitamin B5 Light Moisturizer",
    price: "₹349",
    category: "beauty",
    image: "https://picsum.photos/seed/skincare/400/500",
    creator: "SkinCareDr",
    creatorAvatar: "https://i.pravatar.cc/100?u=skincare",
    saves: "5.1k",
    trustScore: "99% Trust",
    verified: true
  },
  {
    id: "fy-4",
    name: "ASICS Gel-Kayano 30 Stability Shoes",
    price: "₹15,999",
    category: "fitness",
    image: "https://picsum.photos/seed/asics/400/500",
    creator: "FitRun_Vlog",
    creatorAvatar: "https://i.pravatar.cc/100?u=fitrun",
    saves: "3.2k",
    trustScore: "96% Trust",
    verified: false
  },
  {
    id: "fy-5",
    name: "Govee Ambient RGBIC Monitor Light Bar",
    price: "₹5,499",
    category: "study",
    image: "https://picsum.photos/seed/govee/400/500",
    creator: "LofiDeskSetup",
    creatorAvatar: "https://i.pravatar.cc/100?u=setup",
    saves: "1.9k",
    trustScore: "95% Trust",
    verified: true
  },
  {
    id: "fy-6",
    name: "Ergonomic Memory Foam Chair Pillow",
    price: "₹1,899",
    category: "home",
    image: "https://picsum.photos/seed/pillow/400/500",
    creator: "CozyVibesOnly",
    creatorAvatar: "https://i.pravatar.cc/100?u=cozy",
    saves: "850",
    trustScore: "92% Trust",
    verified: false
  }
];

// SECTION 3: TRENDING THIS WEEK - Horizontal Carousel items
const trendingThisWeekProducts = [
  {
    id: "tr-1",
    name: "Sony WH-1000XM5 Active Noise Cancelling Headphones",
    price: "₹26,990",
    image: "https://picsum.photos/seed/sony/400/505",
    metric: "12.4k saves this week",
    tag: "Fastest Growing"
  },
  {
    id: "tr-2",
    name: "Be Minimalist 10% Niacinamide Healing Serum",
    price: "₹599",
    image: "https://picsum.photos/seed/serum/400/506",
    metric: "9.8k saves this week",
    tag: "Most Saved"
  },
  {
    id: "tr-3",
    name: "DailyObjects Vegan Leather Large Desk Mat",
    price: "₹1,499",
    image: "https://picsum.photos/seed/deskmat/400/507",
    metric: "8.1k saves this week",
    tag: "Highly Discussed"
  },
  {
    id: "tr-4",
    name: "Portronics Muffs M2 Wireless Studio Headphones",
    price: "₹1,999",
    image: "https://picsum.photos/seed/muffs/400/508",
    metric: "7.5k saves this week",
    tag: "Fastest Growing"
  }
];

// SECTION 4: TRUSTED CREATORS - horizontal creator strip
const trustedCreators = [
  {
    id: "c-1",
    name: "Rohan's TechLab",
    role: "Tech Expert",
    avatar: "https://i.pravatar.cc/100?u=rohan"
  },
  {
    id: "c-2",
    name: "Ananya Kapoor",
    role: "Dermatologist Expert",
    avatar: "https://i.pravatar.cc/100?u=ananya"
  },
  {
    id: "c-3",
    name: "Vikram Malhotra",
    role: "Footwear & Ergonomics",
    avatar: "https://i.pravatar.cc/100?u=vikram"
  },
  {
    id: "c-4",
    name: "Shreya Ghoshal",
    role: "Workspace Curation",
    avatar: "https://i.pravatar.cc/100?u=shreya"
  }
];

export default function Explore() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get("q");

  const [searchQuery, setSearchQuery] = useState(qParam || "");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const activeRequestRef = useRef<number>(0);

  // Dynamic Explore state
  const [exploreVideos, setExploreVideos] = useState<any[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<any[]>([]);
  
  // Local persistence simulation State lists (Save Product & Follow Creator)
  const [savedProductIds, setSavedProductIds] = useState<string[]>([]);
  const [followedCreatorIds, setFollowedCreatorIds] = useState<string[]>([]);
  
  // Active category filter
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (!exploreVideos.length) {
      fetch('/api/feed?limit=6')
        .then(res => res.json())
        .then(data => data.videos && setExploreVideos(data.videos))
        .catch(console.error);
        
      fetch('/api/feed?tab=trending&limit=4')
        .then(res => res.json())
        .then(data => data.videos && setTrendingVideos(data.videos))
        .catch(console.error);
    }
  }, []);

  // Filter explore dynamically by selectedCategory
  const currentForYou = exploreVideos.length > 0 
    ? exploreVideos.filter(v => selectedCategory === 'all' || v.category_id === selectedCategory)
    : initialForYouProducts.filter(p => selectedCategory === 'all' || p.category === selectedCategory);

  const currentTrending = trendingVideos.length > 0 ? trendingVideos : trendingThisWeekProducts;

  useEffect(() => {
    if (qParam !== null && qParam !== searchQuery) {
      setSearchQuery(qParam);
    }
  }, [qParam]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const updated = new URLSearchParams(searchParams);
    if (!val) {
      updated.delete("q");
    } else {
      updated.set("q", val);
    }
    setSearchParams(updated, { replace: true });
  };

  const handleToggleSaveProduct = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedProductIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleFollowCreator = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowedCreatorIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Dynamic search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const requestId = Date.now();
    activeRequestRef.current = requestId;
    const controller = new AbortController();

    const doSearch = async () => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("q", searchQuery.trim());

        const req = await fetch(`/api/search?${queryParams.toString()}`, {
          signal: controller.signal,
        });
        const data = await req.json();

        if (activeRequestRef.current === requestId) {
          if (data && data.videos) {
            setSearchResults(data.videos);
          } else {
            // Apply high quality search fallback
            const lowerQuery = searchQuery.toLowerCase();
            const localResults = initialForYouProducts.filter(p =>
              p.name.toLowerCase().includes(lowerQuery) ||
              p.creator.toLowerCase().includes(lowerQuery) ||
              p.category.toLowerCase().includes(lowerQuery)
            );
            setSearchResults(localResults);
          }
          setIsSearching(false);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(`[Explore] Search Error:`, err);
        }
        if (activeRequestRef.current === requestId) {
          setIsSearching(false);
        }
      }
    };

    const timer = setTimeout(doSearch, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const isSearchActive = searchQuery.trim() !== "";


  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white font-sans h-full flex flex-col overflow-hidden">
      
      {/* SECTION 1: SEARCH + CATEGORY ENTRY (Header Part) */}
      <div className="sticky top-0 z-30 bg-[#0c0c0e]/95 backdrop-blur-md pt-4 pb-2 px-4 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <GlobalBackButton />
          <div className="relative w-full border border-white/5 bg-[#1c1c1e] rounded-2xl overflow-hidden flex items-center pr-3 focus-within:border-zinc-500 focus-within:bg-[#202024] transition-all">
            <div className="pl-4 pr-1.5 flex items-center justify-center shrink-0">
               <Search className="size-4 text-zinc-400" />
            </div>
            <input
              type="text"
              placeholder="Search products, experts & reviews"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-transparent text-white placeholder-zinc-500 py-3 text-[14px] font-medium focus:outline-none"
            />
            {searchQuery && (
              <button
                 aria-label="Clear Search text"
                 onClick={() => handleSearchChange('')}
                 className="shrink-0 p-1 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category entry chips */}
        <div className="flex overflow-x-auto gap-2 py-3 mt-1 no-scrollbar-x snap-x">
          {categoryChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => {
                setSelectedCategory(chip.id);
                setSearchQuery(""); // clear search query on category tap to avoid conflicting states
              }}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold font-sans transition-all snap-start shrink-0 border",
                selectedCategory === chip.id
                  ? "bg-white text-black border-white"
                  : "bg-[#161619] text-zinc-400 border-white/5 hover:text-white"
              )}
            >
              {chip.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid / Body content area under scroll limit */}
      <div className="flex-1 overflow-y-auto w-full min-h-0 bg-[#0c0c0e] pb-32">
        
        {isSearchActive ? (
          // Active Search Result Layer
          <div className="p-4 animate-in fade-in duration-300">
             <div className="flex items-center justify-between mb-4">
               <span className="text-zinc-400 text-xs font-black tracking-wider uppercase">Fuzzy Match Results</span>
               <button onClick={() => setSearchQuery("")} className="text-xs text-red-500 font-bold">Clear Filter</button>
             </div>

             {isSearching ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                   <Loader2 className="size-6 text-red-500 animate-spin" />
                   <span className="text-xs text-zinc-500">Cross-referencing databases...</span>
                </div>
             ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                   {searchResults.map((item: any, idx: number) => (
                      <div 
                        key={item.id || idx}
                        onClick={() => navigate(item.id ? `/video/${item.id}` : `/video/dummy`)}
                        className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden cursor-pointer group hover:border-white/10 transition-colors"
                      >
                         <div className="relative aspect-[4/3] bg-zinc-800">
                            <img src={item.image || item.thumbnail_url || "https://picsum.photos/seed/product/400/500"} className="size-full object-cover" />
                         </div>
                         <div className="p-3">
                            <h4 className="text-xs font-bold text-white line-clamp-1 leading-snug">{item.name || item.caption}</h4>
                            <div className="flex items-center justify-between mt-2.5">
                               <span className="text-red-500 text-xs font-black">{item.price || "Product Specs"}</span>
                               <span className="text-[10px] text-zinc-500">{item.creator || "Verified review"}</span>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                   <Search className="size-8 text-zinc-650 mb-3" />
                   <p className="text-xs text-zinc-400">No strict matches for "{searchQuery}" on Getnayi.</p>
                </div>
             )}
          </div>
        ) : (
          // Focused 4-Step Architecture
          <div className="flex flex-col gap-8 pt-3 pb-8">
            
            {/* SECTION 2: FOR YOU (The largest section, 2-column product discovery grid) */}
            <section className="px-4">
               <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-black text-white tracking-wider uppercase flex items-center gap-1.5">
                      <Sparkles className="size-4 text-amber-400" /> For You Curation
                    </h2>
                    <p className="subtitle text-[11px] text-zinc-500 mt-0.5">Decision-centric recommendations matching your style</p>
                  </div>
               </div>

               {currentForYou.length > 0 ? (
                 <div className="grid grid-cols-2 gap-3">
                   {currentForYou.map((product) => {
                     const isReal = !!product.video_url; // if db object
                     const productId = product.id;
                     const creatorName = isReal ? product.profiles?.username : product.creator;
                     const image = isReal ? (product.main_product_image_url || product.thumbnail_url) : product.image;
                     const name = isReal ? (product.product_name || product.caption || 'Video Product') : product.name;
                     const price = isReal ? product.product_price : product.price;

                     const isSaved = savedProductIds.includes(productId);
                     const isFollowing = followedCreatorIds.includes(creatorName);
                     return (
                       <div 
                         key={productId}
                         onClick={() => navigate(isReal ? `/video/${productId}` : `/video/dummy`)}
                         className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-zinc-850 hover:scale-[1.01] transition-all duration-300 flex flex-col group relative"
                       >
                          {/* Image Box */}
                          <div className="relative aspect-[4/5] bg-zinc-900">
                             <img src={image} className="size-full object-cover group-hover:scale-102 transition-transform duration-500" alt={name} />
                             
                             {/* Save product icon option */}
                             <button 
                               onClick={(e) => handleToggleSaveProduct(productId, e)}
                               className="absolute top-2.5 right-2.5 size-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
                               aria-label="Save product selection"
                             >
                                <Bookmark className={cn("size-3.5", isSaved ? "fill-red-500 text-red-500 border-red-500" : "text-white")} />
                             </button>

                             {/* Trust rating indicator label badged */}
                             <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-1">
                                <ShieldCheck className="size-3 text-emerald-400 fill-emerald-400/20" />
                                <span className="text-[9.5px] font-bold text-zinc-200">{product.trustScore || '98% Trust'}</span>
                             </div>
                          </div>

                          {/* Info Part */}
                          <div className="p-3.5 flex-1 flex flex-col justify-between">
                             <div>
                                <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">{name}</h3>
                                <p className="text-xs font-black text-red-500 mt-1.5">{price}</p>
                             </div>

                             {/* Creator card inside */}
                             <div className="border-t border-white/5 pt-2.5 mt-3 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                   <img src={isReal ? product.profiles?.avatar_url : product.creatorAvatar} className="size-5 rounded-full object-cover border border-white/20 shrink-0" alt="" />
                                   <div className="min-w-0">
                                     <span className="text-[10px] text-zinc-400 font-bold block truncate">{creatorName}</span>
                                     <span className="text-[8px] text-zinc-600 block">{product.saves || (isReal ? product.saved_videos?.[0]?.count : '3.2k')} saves</span>
                                   </div>
                                </div>

                                <button
                                  onClick={(e) => handleToggleFollowCreator(creatorName, e)}
                                  className={cn(
                                    "px-2 py-1 rounded-md text-[8.5px] font-black uppercase transition-all shrink-0 tracking-wide",
                                    isFollowing ? "bg-white/10 text-white border border-white/5" : "bg-red-500 text-white"
                                  )}
                                >
                                  {isFollowing ? "Following" : "Follow"}
                                </button>
                             </div>
                          </div>
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <div className="bg-[#121215] border border-white/5 rounded-2xl p-8 text-center text-zinc-500 text-xs">
                    No products categorized in "{selectedCategory}" yet.
                 </div>
               )}
            </section>

            {/* SECTION 3: TRENDING THIS WEEK (One horizontal carousel, max 10 items) */}
            <section className="pt-2">
               <div className="px-4 mb-3.5">
                  <h2 className="text-base font-black text-white tracking-wider uppercase flex items-center gap-2">
                    <TrendingUp className="size-4 text-red-500" /> Trending This Week
                  </h2>
                  <p className="text-[11px] text-zinc-500">Most discussed product reviews widely agreed by consumers</p>
               </div>

               <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pt-1 pb-4">
                 {currentTrending.map((product) => {
                     const isReal = !!product.video_url;
                     const image = isReal ? (product.thumbnail_url || product.main_product_image_url) : product.image;
                     const name = isReal ? (product.product_name || product.caption) : product.name;
                     const price = isReal ? product.product_price : product.price;

                     return(
                     <div 
                       key={product.id}
                       onClick={() => navigate(isReal ? `/video/${product.id}` : `/video/dummy`)}
                       className="snap-center shrink-0 w-[160px] bg-[#121215] border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-zinc-800 transition-all group"
                     >
                        <div className="aspect-[4/5] bg-zinc-900 relative">
                           <img src={image} className="size-full object-cover" alt="" />
                           <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md border border-white/5 flex items-center gap-1">
                              <TrendingUp className="size-3 text-red-500" />
                              <span className="text-[9px] font-bold text-white uppercase tracking-wider">{product.tag || 'Trending'}</span>
                           </div>
                        </div>
                        <div className="p-3">
                           <h3 className="text-xs font-semibold text-white line-clamp-1 group-hover:text-red-400 transition-colors">{name}</h3>
                           <div className="flex items-center justify-between mt-1">
                             <span className="text-xs font-black text-zinc-300">{price}</span>
                             <span className="text-[9px] text-zinc-500">{product.metric || `${product.likes?.[0]?.count || 0} likes`}</span>
                           </div>
                        </div>
                     </div>
                   )})}
               </div>
            </section>

            {/* SECTION 4: TRUSTED CREATORS (One horizontal creator strip) */}
            <section className="pt-2 border-t border-white/5">
               <div className="px-4 mb-3.5">
                  <h2 className="text-base font-black text-white tracking-wider uppercase flex items-center gap-1.5">
                    <Award className="size-4 text-violet-400" /> Trusted Core Reviewers
                  </h2>
                  <p className="text-[11px] text-zinc-500">Industry experts & certified specialists making better buying choices</p>
               </div>

               <div className="flex overflow-x-auto gap-3 py-1 px-4 no-scrollbar snap-x">
                 {trustedCreators.map((creator) => {
                   const isFollowing = followedCreatorIds.includes(creator.name);
                   return (
                      <div 
                        key={creator.id}
                        className="snap-start shrink-0 bg-[#121215] border border-white/5 p-4 rounded-2xl flex items-center gap-3.5 w-[240px] hover:border-zinc-800 transition-colors"
                      >
                         <img src={creator.avatar} className="size-11 rounded-full object-cover border border-white/10 shrink-0" />
                         
                         <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-extrabold text-white truncate">{creator.name}</h4>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">{creator.role}</p>
                            
                            <button
                              onClick={(e) => handleToggleFollowCreator(creator.name, e)}
                              className={cn(
                                "mt-2 px-2.5 py-1 rounded-md text-[9px] font-black uppercase transition-all tracking-wide w-fit block",
                                isFollowing ? "bg-zinc-800 text-zinc-500" : "bg-white hover:bg-zinc-200 text-black active:scale-95"
                              )}
                            >
                              {isFollowing ? "Following" : "Follow"}
                            </button>
                         </div>
                      </div>
                   );
                 })}
               </div>
            </section>

          </div>
        )}

      </div>
    </div>
  );
}
