import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Video } from "../types";
import { VideoPlayer } from "../components/VideoPlayer";
import { VideoPlayerSkeleton } from "../components/VideoPlayerSkeleton";
import {
  Play,
  Menu,
  Search,
  Tag,
  ShoppingBag,
  X,
  AlertOctagon,
} from "lucide-react";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { SEO } from "../components/SEO";
import { parseVideoProduct } from "../utils/videoUtils";

export default function Feed() {
  const { videoId } = useParams<{ videoId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const storeParam = searchParams.get("store");
  const tagParam = searchParams.get("tag");

  const [activeTab, setActiveTab] = useState<"for_you" | "trending">("for_you");

  const [videos, setVideos] = useState<Video[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const PAGE_SIZE = 10;

  // Pull-to-refresh states and refs
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const isPulling = useRef(false);

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

  // Touch event handlers for pull-to-refresh gesture
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isRefreshing) return;
    const container = feedRef.current;
    if (container && container.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPulling.current || touchStartY.current === null || isRefreshing)
      return;

    const container = feedRef.current;
    if (!container || container.scrollTop > 0) {
      isPulling.current = false;
      touchStartY.current = null;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0) {
      // Resistance factor to make pull feel physical/natural
      const distance = Math.min(diff * 0.4, 120);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || isRefreshing) return;

    isPulling.current = false;
    touchStartY.current = null;

    if (pullDistance >= 70) {
      setIsRefreshing(true);
      setPullDistance(50); // Keep indicator slightly visible while loading

      try {
        await fetchVideos(null, true);
      } catch (err) {
        console.error("Pull-to-refresh failed:", err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    setVideos([]);
    setCursor(null);
    setHasMore(true);
    fetchVideos(null);
  }, [activeTab, categoryParam, storeParam, tagParam]);

  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore && cursor !== null) {
      fetchVideos(cursor);
    }
  }, [inView, hasMore, loading, loadingMore, cursor]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchVideos = async (
    currentCursor: string | null,
    isSwipeRefresh = false,
  ) => {
    if (!currentCursor && !isSwipeRefresh) setLoading(true);
    else if (currentCursor) setLoadingMore(true);

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
        // Fetch the specific video via API to bypass any client RLS restrictions
        const specRes = await fetch(`/api/videos/${videoId}`);
        if (!specRes.ok) {
          console.warn(
            "Failed to fetch specific video. It might be deleted or restricted.",
          );
        } else {
          const specData = await specRes.json();
          if (specData.data && !controller.signal.aborted) {
            fetchedVideos.push(specData.data);
          }
        }
      }

      // Fetch from API instead of direct Supabase query for feed to use Redis cache & cursor pagination
      const params = new URLSearchParams();
      params.append("tab", activeTab);
      params.append("limit", PAGE_SIZE.toString());
      if (categoryParam) params.append("categoryId", categoryParam);
      if (storeParam) params.append("store", storeParam);
      if (tagParam) params.append("tag", tagParam);
      if (currentCursor) params.append("cursor", currentCursor);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`/api/feed?${params.toString()}`, {
        signal: controller.signal,
        headers: session
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : undefined,
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
      combinedData = combinedData.filter(
        (v: any) => v.status === "active" || v.post_status === "published",
      );

      const combined = !currentCursor
        ? [...fetchedVideos, ...combinedData]
        : combinedData;

      if (!currentCursor) {
        setVideos(combined);
      } else {
        setVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const newVideos = combined.filter((v: any) => !existingIds.has(v.id));
          return [...prev, ...newVideos];
        });
      }

      setHasMore(!!nextCursor);
      setCursor(nextCursor);
    } catch (err: any) {
      if (
        err.name === "AbortError" ||
        err?.message?.includes("Failed to fetch")
      ) {
        // Ignore aborts or unmount network cancellations
        return;
      }
      console.error("Error fetching videos:", err);
      if (!currentCursor) setError(err?.message || "An error occurred");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  if (loading && cursor === null && videos.length === 0) {
    return (
      <div className="h-full bg-[#0c0c0e] relative overflow-hidden">
        {/* Top Header Skeleton */}
        <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-[calc(env(safe-area-inset-top,40px)+8px)] pb-12">
          <div className="flex justify-between items-center px-5">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="size-8 bg-white/10 rounded-[10px] animate-pulse"></div>
              <div className="w-20 h-5 bg-white/10 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-x-6">
              <div className="w-16 h-5 bg-white/10 rounded-md animate-pulse"></div>
              <div className="w-16 h-5 bg-white/10 rounded-md animate-pulse"></div>
            </div>
            <div className="size-8 bg-white/10 rounded-full animate-pulse mr-1" />
          </div>
        </div>

        <VideoPlayerSkeleton className="h-full border-none" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0c0c0e] px-8 text-center font-sans">
        <div className="size-24 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 shadow-xl">
          <AlertOctagon className="size-10 text-rose-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-white font-semibold text-xl mb-2 tracking-tight">
          Couldn't load feed
        </h2>
        <p className="text-sm tracking-wide text-zinc-400 leading-relaxed max-w-[260px] mb-8">
          Please check your connection and try again.
        </p>
        <button
          type="button"
          aria-label="button"
          onClick={() => fetchVideos(null)}
          className="px-8 py-3.5 bg-white text-black rounded-xl font-semibold active:scale-95 transition-all shadow-lg hover:bg-zinc-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0c0c0e] px-8 text-center">
        <div className="size-24 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-8 shadow-xl">
          <Play className="size-10 text-zinc-600 ml-2" strokeWidth={1.5} />
        </div>
        <h2 className="text-white font-sans font-semibold text-xl mb-3 tracking-tight">
          No videos found
        </h2>
        <p className="text-sm font-sans tracking-wide text-zinc-400 leading-relaxed max-w-[260px]">
          We couldn't find any active content right now. Check back later or
          adjust your filters.
        </p>
      </div>
    );
  }

  const activeVideo = videos[activeIndex];
  const activeVideoCaption = activeVideo
    ? parseVideoProduct(activeVideo.caption).captionText
    : "";
  const activeVideoSchema = activeVideo
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: activeVideoCaption || "Video on Aisles",
        description:
          activeVideoCaption ||
          "Discover and shop products through immersive video experiences.",
        thumbnailUrl: [
          activeVideo.thumbnail_url || "https://aisles.app/og-image.jpg",
        ],
        uploadDate: activeVideo.created_at || new Date().toISOString(),
        contentUrl: activeVideo.video_url,
        duration: "PT30S", // Default representation for short-form video
        creator: activeVideo.profiles?.username
          ? {
              "@type": "Person",
              name: activeVideo.profiles.username,
              url: `https://aisles.app/creator/${activeVideo.profiles.username}`,
            }
          : undefined,
        publisher: {
          "@type": "Organization",
          name: "Aisles",
          logo: {
            "@type": "ImageObject",
            url: "https://aisles.app/logo.png",
          },
        },
      }
    : undefined;

  return (
    <div className="relative w-full h-full bg-[#0c0c0e] pb-0">
      {activeVideo && (
        <SEO
          title={`${activeVideoCaption ? activeVideoCaption.substring(0, 50) + "..." : "Getnayi Video"} | Getnayi`}
          description={
            activeVideoCaption ||
            "Watch this video on Getnayi, the premier video commerce platform."
          }
          image={activeVideo.thumbnail_url}
          type="video.other"
          url={`https://getnayi.app/video/${activeVideo.id}`}
          structuredData={activeVideoSchema}
          breadcrumbs={[
            { name: "Home", item: "https://getnayi.app" },
            { name: "Explore", item: "https://getnayi.app/explore" },
            {
              name: "Video",
              item: `https://getnayi.app/video/${activeVideo.id}`,
            },
          ]}
        />
      )}

      {/* Pull-To-Refresh Indicator */}
      <div
        className="absolute top-[calc(env(safe-area-inset-top,40px)+60px)] left-0 right-0 z-30 flex justify-center pointer-events-none transition-all duration-150 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`,
          opacity: pullDistance > 0 ? Math.min(pullDistance / 50, 1) : 0,
        }}
      >
        <div className="bg-zinc-950/90 border border-white/10 text-white rounded-full p-2.5 shadow-xl backdrop-blur-md flex items-center justify-center size-10">
          <svg
            className={cn(
              "size-5 text-white transition-transform duration-75",
              isRefreshing ? "animate-spin" : "",
            )}
            style={{
              transform: isRefreshing
                ? undefined
                : `rotate(${pullDistance * 4}deg)`,
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </div>
      </div>

      {/* Top Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none bg-gradient-to-b from-black/70 via-black/30 to-transparent pt-[calc(env(safe-area-inset-top,40px)+12px)] pb-12">
        <div className="flex justify-center items-center px-5 pointer-events-auto">
          <div className="flex items-center gap-x-7">
            <button
              type="button"
              aria-label="Trending Feed"
              onClick={() => setActiveTab("trending")}
              className={cn(
                "relative py-2 font-sans transition-all duration-200 cursor-pointer",
                activeTab === "trending"
                  ? "text-white font-bold text-[17px]"
                  : "text-white/70 font-semibold text-[16px] hover:text-white/90",
              )}
            >
              <span className="drop-shadow-sm font-sans">Trending</span>
              {activeTab === "trending" && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-[20%] right-[20%] h-[3px] bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                />
              )}
            </button>

            <button
              type="button"
              aria-label="For You Feed"
              onClick={() => setActiveTab("for_you")}
              className={cn(
                "relative py-2 font-sans transition-all duration-200 cursor-pointer",
                activeTab === "for_you"
                  ? "text-white font-bold text-[17px]"
                  : "text-white/70 font-semibold text-[16px] hover:text-white/90",
              )}
            >
              <span className="drop-shadow-sm font-sans">For You</span>
              {activeTab === "for_you" && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-[20%] right-[20%] h-[3px] bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                />
              )}
            </button>
          </div>
        </div>

        {/* Filter overlay indicator */}
        {(storeParam || tagParam) && (
          <div className="mx-4 mt-3 bg-zinc-900/90 backdrop-blur-xl border border-white/5 rounded-2xl px-4 py-3.5 flex items-center justify-between pointer-events-auto shadow-lg animate-fade-in select-none">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-[#ff5a36] font-sans font-bold">
                Active Filter
              </span>
              <span className="text-white text-sm font-sans font-medium tracking-tight flex items-center gap-2">
                {storeParam ? (
                  <>
                    <ShoppingBag className="size-4 text-zinc-400" />
                    <span>Store: {storeParam}</span>
                  </>
                ) : (
                  <>
                    <Tag className="size-4 text-zinc-400" />
                    <span>Tag: #{tagParam}</span>
                  </>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const updated = new URLSearchParams(searchParams);
                updated.delete("category");
                updated.delete("store");
                updated.delete("tag");
                setSearchParams(updated);
              }}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white text-xs font-medium rounded-lg border border-white/5 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <X className="size-3.5" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      <div
        ref={feedRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="absolute inset-0 overflow-y-auto snap-y snap-mandatory no-scrollbar touch-pan-y"
        dir="ltr"
      >
        {videos.map((video, index) => {
          const isNearActive = Math.abs(index - activeIndex) <= 2;

          if (!isNearActive) {
            // Render a lightweight placeholder with exact height to maintain scroll positioning
            return (
              <div
                key={video.id}
                className="w-full h-[100dvh] snap-start relative bg-black shrink-0"
              />
            );
          }

          return (
            <VideoPlayer
              key={video.id}
              video={video}
              isActive={index === activeIndex}
            />
          );
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
