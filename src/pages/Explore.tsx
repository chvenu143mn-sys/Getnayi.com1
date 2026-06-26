import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, X, Bookmark, TrendingUp } from "lucide-react";
import { cn } from "../lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GlobalBackButton } from "../components/GlobalBackButton";

const categoryChips = [
  { id: "all", name: "All Categories" },
  { id: "tech", name: "Tech" },
  { id: "fashion", name: "Fashion" },
  { id: "beauty", name: "Beauty" },
  { id: "fitness", name: "Fitness" },
  { id: "home", name: "Home" },
  { id: "study", name: "Study" },
  { id: "travel", name: "Travel" },
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

  const [savedProductIds, setSavedProductIds] = useState<string[]>([]);
  const [followedCreatorIds, setFollowedCreatorIds] = useState<string[]>([]);

  // Active category filter
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (!exploreVideos.length) {
      fetch("/api/feed?limit=6")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.data)) {
            setExploreVideos(data.data);
          }
        })
        .catch(console.error);

      fetch("/api/feed?tab=trending&limit=4")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.data)) {
            setTrendingVideos(data.data);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Filter explore dynamically by selectedCategory
  const currentForYou = (exploreVideos || []).filter(
    (v) => selectedCategory === "all" || v.category_id === selectedCategory,
  );
  const currentTrending = trendingVideos || [];

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
    setSavedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleFollowCreator = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowedCreatorIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
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
            setSearchResults([]);
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
      <div className="sticky top-0 z-30 bg-[#0c0c0e]/95 backdrop-blur-md pt-4 pb-3 px-4 md:px-8 shrink-0 border-b border-white/5 shadow-sm">
        <div className="flex items-center gap-3">
          <GlobalBackButton />
          <div className="relative w-full border border-white/5 bg-[#18181b] rounded-full overflow-hidden flex items-center pr-3 focus-within:border-zinc-500 focus-within:bg-[#202024] transition-all shadow-inner">
            <div className="pl-4 pr-1.5 flex items-center justify-center shrink-0">
              <Search className="size-4 text-zinc-400" />
            </div>
            <input
              type="text"
              placeholder="Search products, experts..."
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full min-h-[44px] bg-transparent text-white placeholder-zinc-400 py-2.5 text-[14px] font-medium focus:outline-none"
            />
            {searchQuery && (
              <button
                aria-label="Clear Search text"
                onClick={() => handleSearchChange("")}
                className="shrink-0 p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category entry chips */}
        <div className="flex overflow-x-auto gap-2 py-3 mt-1 no-scrollbar-x snap-x px-4 md:px-8">
          {categoryChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => {
                setSelectedCategory(chip.id);
                setSearchQuery(""); // clear search query on category tap to avoid conflicting states
              }}
              className={cn(
                "whitespace-nowrap px-4 md:px-8 py-2 rounded-full text-xs font-bold font-sans transition-all snap-start shrink-0 border",
                selectedCategory === chip.id
                  ? "bg-white text-black border-white"
                  : "bg-[#161619] text-zinc-400 border-white/5 hover:text-white",
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
              <span className="text-zinc-400 text-xs font-black tracking-wider uppercase">
                Fuzzy Match Results
              </span>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-red-500 font-bold"
              >
                Clear Filter
              </button>
            </div>

            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="size-6 text-[#ff5a36] animate-spin" />
                <span className="text-xs text-zinc-400">
                  Cross-referencing databases...
                </span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
                {searchResults.map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    onClick={() =>
                      navigate(item.id ? `/video/${item.id}` : `/video/dummy`)
                    }
                    className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden cursor-pointer group hover:border-white/10 transition-colors"
                  >
                    <div className="relative aspect-[4/3] bg-zinc-800">
                      <img
                        src={
                          item.thumbnail_url ||
                          "https://picsum.photos/seed/product/400/500"
                        }
                        className="size-full object-cover"
                        loading="lazy"
                        decoding="async"
                        alt=""
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="text-xs font-bold text-white line-clamp-1 leading-snug">
                        {item.caption || item.product_name}
                      </h4>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="text-red-500 text-xs font-black">
                          {item.product_price || "Product Specs"}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {item.profiles?.username || "Verified review"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="size-8 text-zinc-650 mb-3" />
                <p className="text-xs text-zinc-400">
                  No strict matches for "{searchQuery}" on Getnayi.
                </p>
              </div>
            )}
          </div>
        ) : (
          // Focused Architecture
          <div className="flex flex-col gap-8 pt-3 pb-8">
            {/* SECTION 2: FOR YOU */}
            <div className="h-2 w-full bg-[#151518] border-y border-white/5 my-4" />
            <section className="px-4 md:px-8">
              <div className="mb-6">
                <h2 className="text-[22px] font-display font-bold text-white tracking-tight">
                  For you
                </h2>
                <p className="text-[14px] text-zinc-400 mt-1 font-medium">
                  Curated products matching your style
                </p>
              </div>

              {currentForYou.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentForYou.map((product) => {
                    const productId = product.id;
                    const creatorName = product.profiles?.username;
                    const image =
                      product.main_product_image_url || product.thumbnail_url;
                    const name =
                      product.product_name ||
                      product.caption ||
                      "Video Product";
                    const price = product.product_price;

                    const isSaved = productId ? savedProductIds.includes(productId) : false;
                    const isFollowing = creatorName ? followedCreatorIds.includes(creatorName) : false;
                    return (
                      <div
                        key={productId}
                        onClick={() => navigate(`/video/${productId}`)}
                        className="bg-zinc-900/40 rounded-2xl overflow-hidden cursor-pointer hover:bg-zinc-900/80 transition-colors duration-300 flex flex-col group relative"
                      >
                        {/* Image Box */}
                        <div className="relative aspect-[4/5] bg-zinc-800 overflow-hidden">
                          <img
                            src={image}
                            className="size-full object-cover"
                            alt={name}
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="absolute inset-0 bg-black/5" />

                          {/* Save product icon option */}
                          <button
                            onClick={(e) =>
                              handleToggleSaveProduct(productId, e)
                            }
                            className="absolute top-3 right-3 size-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 active:scale-95 transition-all"
                            aria-label="Save product selection"
                          >
                            <Bookmark
                              className={cn(
                                "size-[18px]",
                                isSaved
                                  ? "fill-white text-white"
                                  : "text-white",
                              )}
                              strokeWidth={isSaved ? 0 : 2}
                            />
                          </button>
                        </div>

                        {/* Info Part */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-[15px] font-semibold text-white/90 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                              {name}
                            </h3>
                            <p className="text-[14px] font-medium text-zinc-400 mt-1">
                              {price}
                            </p>
                          </div>

                          {/* Creator card inside */}
                          <div className="pt-4 mt-auto flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={product.profiles?.avatar_url}
                                className="size-6 rounded-full object-cover shrink-0"
                                alt=""
                                loading="lazy"
                                decoding="async"
                              />
                              <div className="min-w-0">
                                <span className="text-[12px] text-white font-medium block truncate tracking-tight">
                                  {creatorName}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={(e) =>
                                handleToggleFollowCreator(creatorName, e)
                              }
                              className={cn(
                                "px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shrink-0",
                                isFollowing
                                  ? "bg-white/10 text-white"
                                  : "bg-white text-black active:scale-95 hover:bg-zinc-200",
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
                <div className="bg-[#121215] border border-white/5 rounded-2xl p-8 text-center text-zinc-400 text-xs">
                  No products categorized in "{selectedCategory}" yet.
                </div>
              )}
            </section>

            {/* SECTION 3: TRENDING THIS WEEK */}
            {currentTrending.length > 0 && (
              <section className="pt-6">
                <div className="px-4 md:px-8 mb-5">
                  <h2 className="text-[22px] font-display font-bold text-white tracking-tight">
                    Trending
                  </h2>
                  <p className="text-[14px] text-zinc-400 mt-1 font-medium">
                    Most discussed products this week
                  </p>
                </div>

                <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-8 pb-4">
                  {currentTrending.map((product) => {
                    const image =
                      product.thumbnail_url || product.main_product_image_url;
                    const name = product.product_name || product.caption;
                    const price = product.product_price;

                    return (
                      <div
                        key={product.id}
                        onClick={() => navigate(`/video/${product.id}`)}
                        className="snap-start shrink-0 w-[160px] bg-zinc-900/40 rounded-[16px] overflow-hidden cursor-pointer hover:bg-zinc-900/80 transition-all group"
                      >
                        <div className="aspect-[4/5] bg-zinc-800 relative overflow-hidden">
                          <img
                            src={image}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="absolute inset-0 bg-black/5" />
                          <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1.5">
                            <TrendingUp
                              className="size-3 text-[#ff5a36]"
                              strokeWidth={2.5}
                            />
                            <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                              Trending
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5">
                          <h3 className="text-[13px] font-medium text-white/90 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                            {name}
                          </h3>
                          <div className="flex flex-col mt-2">
                            <span className="text-[13px] font-semibold text-white">
                              {price}
                            </span>
                            <span className="text-[11px] font-medium text-zinc-500 mt-0.5">{`${product.likes?.[0]?.count || 0} likes`}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
