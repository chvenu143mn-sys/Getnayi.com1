import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Video } from "../types";
import { VideoPlayer } from "../components/VideoPlayer";
import { VideoPlayerSkeleton } from "../components/VideoPlayerSkeleton";
import { GuestGate } from "../components/GuestGate";
import { useAuth } from "../context/AuthContext";
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
import { safeFetch } from "../utils/apiClient";
import { SEO } from "../components/SEO";
import { parseVideoProduct } from "../utils/videoUtils";
import { theme } from "../styles/theme";

export default function Feed() {
  const { user } = useAuth();
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
        try {
          const specRes = await safeFetch(`/api/videos/${videoId}`);
          if (specRes && specRes.data && !controller.signal.aborted) {
            fetchedVideos.push(specRes.data);
          }
        } catch (specErr) {
          console.warn("Failed to fetch specific video. It might be deleted or restricted.", specErr);
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

      const resData = await safeFetch(`/api/feed?${params.toString()}`, {
        signal: controller.signal,
        headers: session
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : undefined,
      });

      if (controller.signal.aborted) return;
      const { data, nextCursor } = resData || { data: [], nextCursor: null };

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
      <div className="h-full bg-bg-base relative overflow-hidden">
        {/* Top Header Skeleton */}
        <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none bg-gradient-to-b from-bg-base/90 via-bg-base/50 to-transparent pt-[calc(env(safe-area-inset-top,40px)+8px)] pb-12">
          <div className="flex justify-between items-center px-5">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="size-8 bg-surface-2 rounded-xl animate-pulse"></div>
              <div className="w-20 h-5 bg-surface-2 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-x-6">
              <div className="w-16 h-5 bg-surface-2 rounded-md animate-pulse"></div>
              <div className="w-16 h-5 bg-surface-2 rounded-md animate-pulse"></div>
            </div>
            <div className="size-8 bg-surface-2 rounded-full animate-pulse mr-1" />
          </div>
        </div>

        <VideoPlayerSkeleton className="h-full border-none" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full px-8 text-center font-sans", theme.colors.bgBase)}>
        <div className="size-24 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-6 shadow-xl">
          <AlertOctagon className={cn("size-10", theme.colors.brandPrimary)} strokeWidth={1.5} />
        </div>
        <h2 className={cn("font-display font-semibold text-2xl mb-2 tracking-tight", theme.colors.textPrimary)}>
          Couldn't load feed
        </h2>
        <p className={cn("text-base tracking-wide leading-relaxed max-w-[280px] mb-8", theme.colors.textSecondary)}>
          Please check your connection and try again.
        </p>
        <button
          type="button"
          aria-label="button"
          onClick={() => fetchVideos(null)}
          className={cn("px-8 py-3.5 bg-text-primary text-bg-base rounded-full font-semibold active:scale-95 transition-all shadow-lg hover:bg-white/90")}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full px-8 text-center font-sans", theme.colors.bgBase)}>
        <div className={cn("size-24 rounded-full border flex items-center justify-center mb-8 shadow-xl", theme.colors.surface1, theme.colors.borderSubtle)}>
          <Play className={cn("size-10 ml-2", theme.colors.textSecondary)} strokeWidth={1.5} />
        </div>
        <h2 className={cn("font-display font-semibold text-2xl mb-3 tracking-tight", theme.colors.textPrimary)}>
          No videos found
        </h2>
        <p className={cn("text-base leading-relaxed max-w-[280px]", theme.colors.textSecondary)}>
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

  const handleCloseGate = () => {
    if (feedRef.current) {
      const windowHeight = feedRef.current.clientHeight;
      feedRef.current.scrollTo({
        top: windowHeight * 2,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={cn("relative w-full h-full pb-0", theme.colors.bgBase)}>
      <AnimatePresence>
        {!user && activeIndex >= 3 && (
          <GuestGate
            type="action"
            title="Sign up to continue watching"
            description="Create a free account to unlock endless inspiration and discover your next favorite product."
            onClose={handleCloseGate}
          />
        )}
      </AnimatePresence>

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
        <div className="bg-surface-1 border border-border-subtle text-text-primary rounded-full p-2.5 shadow-xl backdrop-blur-md flex items-center justify-center size-10">
          <svg
            className={cn(
              "size-5 text-text-primary transition-transform duration-75",
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
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-none bg-gradient-to-b from-black/60 via-black/20 to-transparent pt-[calc(env(safe-area-inset-top,40px)+12px)] pb-16">
        <div className="flex justify-center items-center px-5 pointer-events-auto">
          <div className="flex items-center gap-x-6 px-5 py-1">
            <button
              type="button"
              aria-label="Trending Feed"
              onClick={() => setActiveTab("trending")}
              className={cn(
                "relative py-2 font-display transition-all duration-300 cursor-pointer",
                activeTab === "trending"
                  ? "text-white font-bold text-[17px] drop-shadow-md"
                  : "text-white/70 font-semibold text-[16px] hover:text-white drop-shadow-sm",
              )}
            >
              <span>Trending</span>
              {activeTab === "trending" && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-white rounded-full shadow-sm"
                />
              )}
            </button>

            <button
              type="button"
              aria-label="For You Feed"
              onClick={() => setActiveTab("for_you")}
              className={cn(
                "relative py-2 font-display transition-all duration-300 cursor-pointer",
                activeTab === "for_you"
                  ? "text-white font-bold text-[17px] drop-shadow-md"
                  : "text-white/70 font-semibold text-[16px] hover:text-white drop-shadow-sm",
              )}
            >
              <span>For You</span>
              {activeTab === "for_you" && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-white rounded-full shadow-sm"
                />
              )}
            </button>
          </div>
        </div>

        {/* Filter overlay indicator */}
        {(storeParam || tagParam) && (
          <div className="mx-4 mt-4 bg-surface-1/90 backdrop-blur-xl border border-border-subtle rounded-2xl px-5 py-4 flex items-center justify-between pointer-events-auto shadow-lg animate-fade-in select-none">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wider text-brand-primary font-sans font-bold">
                Active Filter
              </span>
              <span className="text-text-primary text-sm font-sans font-medium tracking-tight flex items-center gap-2">
                {storeParam ? (
                  <>
                    <ShoppingBag className="size-4 text-text-secondary" />
                    <span>Store: {storeParam}</span>
                  </>
                ) : (
                  <>
                    <Tag className="size-4 text-text-secondary" />
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
              className="px-3.5 py-2 bg-surface-2 hover:bg-surface-2/80 active:scale-95 text-text-primary text-xs font-medium rounded-xl border border-border-subtle transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
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
