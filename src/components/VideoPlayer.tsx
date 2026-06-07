import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import DOMPurify from 'dompurify';
import { ShoppingBag, ShoppingCart, Play, Volume2, VolumeX, Heart, Share2, Flag, X, AlertOctagon, MessageCircle, Send, BadgeCheck, ShieldCheck, Trash2, Loader2, ChevronRight, ArrowLeft, ShieldAlert, Bookmark, Disc, Plus, ChevronLeft, MoreHorizontal, Star, Link as LinkIcon, Tag, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Hls from 'hls.js';
import { Video } from '../types';
import { GuestGate } from './GuestGate';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { parseVideoProduct, formatINR, extractStoreName } from '../utils/videoUtils';
import { CommentDrawer } from './CommentDrawer';
import { ShareDrawer } from './ShareDrawer';

import { setGlobalMuted, getGlobalMuted, MUTE_STATE_EVENT } from '../lib/muteState';

const REPORT_CATEGORIES = [
  { id: 'fake_product', label: 'Fake Product', description: 'This product is fake or scam' },
  { id: 'spam', label: 'Spam', description: 'Unwanted or repetitive content' },
  { id: 'suspicious_link', label: 'Suspicious Link', description: 'Unsafe or suspicious link' },
  { id: 'counterfeit', label: 'Counterfeit Item', description: 'Looks like a counterfeit' },
  { id: 'fake_image', label: 'Fake Real-life Image', description: 'Image is not real or misleading' }
];

// Helper functions removed

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
}

const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return "0:00";
  const mins = Math.floor(timeInSeconds / 60);
  const secs = Math.floor(timeInSeconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const VideoPlayer = React.memo(function VideoPlayer({ video, isActive: isParentActive }: VideoPlayerProps) {
  const parsedProduct = parseVideoProduct(video.caption);

  const resolvedVideoUrl = React.useMemo(() => {
    if (!video.video_url) return '';
    const match = video.video_url.match(/https?:\/\/[^\/]+\/([a-f0-9\-]+)\//i);
    if (match && match[1]) {
      // Use local stream proxy which handles Bunny CDN token auth and correct referers 
      return `/api/stream/${match[1]}/playlist.m3u8`;
    }
    return video.video_url;
  }, [video.video_url]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(getGlobalMuted());
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  
  const [showSlowConnectionToast, setShowSlowConnectionToast] = useState(false);

  // Use denormalized metrics from the API payload (N+1 fixed)
  const [isLiked, setIsLiked] = useState(video.user_state?.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(video.metrics?.likes ?? 0);
  const [isSaved, setIsSaved] = useState(video.user_state?.is_saved ?? false);
  const [savesCount, setSavesCount] = useState(video.metrics?.saves ?? 0);
  const [commentsCount, setCommentsCount] = useState(video.metrics?.comments ?? 0);
  const [showCommentDrawer, setShowCommentDrawer] = useState(false);
  const [showShareDrawer, setShowShareDrawer] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  // Reconcile possible views variations depending on backend cache vs direct db hit
  const [viewsCount, setViewsCount] = useState(video.metrics?.views ?? video.views ?? 0);
  // Reusable follower state
  const [isFollowing, setIsFollowing] = useState(video.user_state?.is_followed ?? false);
  
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showVerifiedInfo, setShowVerifiedInfo] = useState(false);
  
  // View count tracker (true if already viewed in DB or this session)
  const [hasViewedLocallyThisSession, setHasViewedLocallyThisSession] = useState(false);

  // useInView for Feed Intersection
  const { ref: inViewRef } = useInView({
    threshold: 0.6,
  });

  const { ref: nearViewRef, inView: isNearView } = useInView({
    rootMargin: '1200px 0px', // Preload videos up to 1200px (approx 1 screen) away
  });

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (isBuffering && !hasError && isNearView) {
      t = setTimeout(() => {
        setShowSlowConnectionToast(true);
      }, 3000);
    } else {
      setShowSlowConnectionToast(false);
    }
    return () => clearTimeout(t);
  }, [isBuffering, hasError, isNearView]);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      inViewRef(node);
      nearViewRef(node);
    },
    [inViewRef, nearViewRef]
  );

  // Calculate actual active state
  const isActive = isParentActive;

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<{id: string, label: string, priority: string, description?: string, color?: string} | null>(null);
  const [reportStep, setReportStep] = useState<1 | 2>(1);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  
  // Product Details Modal state
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [detailsActiveSection, setDetailsActiveSection] = useState<'main' | 'coupon'>('main');
  const [isCopied, setIsCopied] = useState(false);
  const [showPurchaseDisclaimer, setShowPurchaseDisclaimer] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [showMetadata, setShowMetadata] = useState<boolean>(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const wasPlayingBeforeScrub = useRef<boolean>(false);
  const lastTapRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup click timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const scrubThrottleRef = useRef<any>(null);
  if (!scrubThrottleRef.current) {
    scrubThrottleRef.current = throttle((time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    }, 100);
  }
  const scrubThrottle = scrubThrottleRef.current;

  // Cleanup throttle on unmount
  useEffect(() => {
    return () => {
      scrubThrottle.cancel();
    }
  }, [scrubThrottle]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!timelineRef.current || !duration) return;
    
    setIsScrubbing(true);
    wasPlayingBeforeScrub.current = !videoRef.current?.paused;
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }

    const updateTimeFromEvent = (clientX: number) => {
      if (!timelineRef.current || !duration) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const newTime = percentage * duration;
      setCurrentTime(newTime);
      scrubThrottle(newTime);
    };

    updateTimeFromEvent(e.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      updateTimeFromEvent(moveEvent.clientX);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      
      setIsScrubbing(false);
      scrubThrottle.cancel();
      
      if (!timelineRef.current || !duration) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(upEvent.clientX - rect.left, rect.width));
      const newTime = (x / rect.width) * duration;
      
      setCurrentTime(newTime);
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
        if (wasPlayingBeforeScrub.current) {
          videoRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  };

  const triggerAuthGate = (actionReason: string) => {
    setAuthModalReason(actionReason);
    setShowAuthModal(true);
  };

  const getAuthModalIcon = () => {
    const reason = authModalReason || '';
    if (reason.includes('like')) {
      return (
        <div className="size-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center animate-bounce mb-4 mx-auto">
          <Heart className="size-8 fill-red-500 text-red-500" />
        </div>
      );
    }

    if (reason.includes('share')) {
      return (
        <div className="size-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center animate-bounce mb-4 mx-auto">
          <Share2 className="size-8 text-emerald-500" />
        </div>
      );
    }
    if (reason.includes('product')) {
      return (
        <div className="size-16 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center animate-bounce mb-4 mx-auto">
          <ShoppingBag className="size-8 text-indigo-500" />
        </div>
      );
    }
    return (
      <div className="size-16 bg-white/10 text-white rounded-full flex items-center justify-center animate-bounce mb-4 mx-auto">
        <BadgeCheck className="size-8 text-white" />
      </div>
    );
  };

  // Sync global mute state
  useEffect(() => {
    const handleMuteChange = (e: any) => {
      const newMuted = e.detail;
      setIsMuted(newMuted);
      if (videoRef.current) {
        videoRef.current.muted = newMuted;
      }
    };
    window.addEventListener(MUTE_STATE_EVENT, handleMuteChange);
    return () => window.removeEventListener(MUTE_STATE_EVENT, handleMuteChange);
  }, []);

  // Track views once per valid active playback (require 2s watch time like standard high quality platforms)
  useEffect(() => {
    let viewTimer: NodeJS.Timeout;
    
    if (isActive && isPlaying && !hasViewedLocallyThisSession) {
      viewTimer = setTimeout(() => {
          const incrementViews = async () => {
            try {
              // Try the highly scalable Redis write-buffer API first (Phases 2 & 3)
              const sessionData = await supabase.auth.getSession();
              const sessionToken = sessionData.data.session?.access_token;
              
              const response = await fetch(`/api/videos/${video.id}/view`, {
                method: 'POST',
                credentials: 'include',
                headers: { 
                  'Content-Type': 'application/json',
                  ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
                }
              });

              if (response.ok) {
                const resData = await response.json();
                if (resData.success) {
                  if (resData.views !== undefined && resData.views !== null) {
                    setViewsCount(resData.views);
                  }
                  setHasViewedLocallyThisSession(true);
                }
              }
            } catch (e) {
              console.error('Error incrementing views', e);
            }
          };
          incrementViews();
      }, 2000); // 2s watch time to count as a view like standard high quality platforms
    }
    
    return () => clearTimeout(viewTimer);
  }, [isActive, isPlaying, hasViewedLocallyThisSession, video.id, user]);

  // Update state if video metrics/state changes externally from feed reloading
  useEffect(() => {
    setLikesCount(video.metrics?.likes ?? 0);
    setIsLiked(video.user_state?.is_liked ?? false);
    setSavesCount(video.metrics?.saves ?? 0);
    setIsSaved(video.user_state?.is_saved ?? false);
    setCommentsCount(video.metrics?.comments ?? 0);
    setIsFollowing(video.user_state?.is_followed ?? false);
    // don't overwrite viewscount if it was buffered locally to be higher
    setViewsCount(prev => Math.max(prev, video.metrics?.views ?? video.views ?? 0));
    setHasViewedLocallyThisSession(false);
  }, [video.id, video.metrics, video.user_state, video.views]);

  // Handle HLS and Video Source
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !resolvedVideoUrl || hasError) return;

    let hls: Hls | null = null;

    if (resolvedVideoUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({ maxBufferLength: 30 });
        hls.loadSource(resolvedVideoUrl);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Could be a 404 still processing from BunnyCDN. Auto-retried by another effect
                console.warn('Network error, retrying via effect...', data);
                hls?.destroy();
                setHasError(true);
                setIsBuffering(false);
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('fatal media error encountered, try to recover');
                hls?.recoverMediaError();
                break;
              default:
                hls?.destroy();
                setHasError(true);
                setIsBuffering(false);
                break;
            }
          }
        });
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (e.g. Safari)
        videoElement.src = resolvedVideoUrl;
      }
    } else {
      // Fallback standard video formats
      videoElement.src = resolvedVideoUrl;
    }

    return () => {
      if (hls) hls.destroy();
      if (videoElement) {
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
      }
    };
  }, [resolvedVideoUrl, hasError, isNearView]);

  // Auto native retry if still processing
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (hasError && isNearView && retryCount < 3) {
      t = setTimeout(() => {
        setHasError(false);
        setRetryCount(c => c + 1);
        setIsBuffering(true);
      }, 4000);
    }
    return () => clearTimeout(t);
  }, [hasError, isNearView, retryCount]);

  // Handle Play/Pause and cleanup when unmounting
  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (isActive) {
      videoElement?.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Autoplay prevented:', err);
        setIsPlaying(false);
      });
    } else {
      videoElement?.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  // Handle page visibility (pause when switching tabs/backgrounding)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        videoRef.current?.pause();
        setIsPlaying(false);
      } else if (isActive) {
        videoRef.current?.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.warn('Autoplay prevented on visible:', err);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      handleDoubleTapToLike(e);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = setTimeout(() => {
        togglePlay();
        clickTimeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleDoubleTapToLike = (e: React.MouseEvent) => {
    if (!user) {
      triggerAuthGate("like this video");
      return;
    }

    // Always trigger the center heart pop animation on double-tap
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 1000);

    // Only likes the video if it is not already liked
    if (!isLiked) {
      handleLikeToggle(e);
    }
  };

  const lastLikeTime = useRef<number>(0);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Throttle: Prevent clicks within 500ms
    const now = Date.now();
    if (now - lastLikeTime.current < 500) return;
    lastLikeTime.current = now;

    if (!user) {
      triggerAuthGate("like this video");
      return;
    }

    const previousLiked = isLiked;
    setIsLiked(!previousLiked);
    setLikesCount(prev => previousLiked ? prev - 1 : prev + 1);

    // Call API immediately
    try {
      const action = !previousLiked ? 'like' : 'unlike';
      const sessionData = await supabase.auth.getSession();
      const sessionToken = sessionData.data.session?.access_token;
      
      const response = await fetch(`/api/engagement/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ videoId: video.id })
      });

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : null;

      if (!response.ok || !data || (!data.success && data.error === 'Too many engagement actions. Please slow down.')) {
        if (data && data.error) {
          alert(data.error);
        } else {
          console.warn(`Non-JSON or error response (${response.status}) when trying to ${action} video`);
        }
        setIsLiked(previousLiked);
        setLikesCount(prev => previousLiked ? prev + 1 : prev - 1);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      triggerAuthGate("save this video");
      return;
    }

    const previousSaved = isSaved;
    setIsSaved(!previousSaved);
    setSavesCount(prev => previousSaved ? prev - 1 : prev + 1);

    try {
      const action = !previousSaved ? 'save' : 'unsave';
      const sessionData = await supabase.auth.getSession();
      const sessionToken = sessionData.data.session?.access_token;
      
      const response = await fetch(`/api/engagement/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ videoId: video.id })
      });

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : null;

      if (!response.ok || !data || (!data.success && data.error === 'Too many engagement actions. Please slow down.')) {
        if (data && data.error) {
          alert(data.error);
        } else {
          console.warn(`Non-JSON or error response (${response.status}) when trying to ${action} video`);
        }
        setIsSaved(previousSaved);
        setSavesCount(prev => previousSaved ? prev + 1 : prev - 1);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setGlobalMuted(!isMuted);
  };

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      triggerAuthGate("follow creators");
      return;
    }
    if (!video.user_id || video.user_id === user.id) return;

    setIsFollowingLoading(true);
    try {
      const action = isFollowing ? 'unfollow' : 'follow';
      const sessionData = await supabase.auth.getSession();
      const sessionToken = sessionData.data.session?.access_token;
      
      const response = await fetch(`/api/engagement/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ targetUserId: video.user_id })
      });

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : null;
      
      if (response.ok && data && data.success) {
        setIsFollowing(action === 'follow');
      } else {
        alert(data?.error || 'Could not update follow status');
      }
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      alert('Could not update follow status');
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSharing) return;
    setIsSharing(true);
    
    let tempShareUrl = `${window.location.origin}/video/${video.id}`;
    
    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ longUrl: `/video/${video.id}` })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.shortUrl) {
          tempShareUrl = `${window.location.origin}${data.shortUrl}`;
        }
      }
    } catch (err) {
      console.warn("Failed to shorten url", err);
    }

    setShareUrl(tempShareUrl);
    setShowShareDrawer(true);
    setIsSharing(false);
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      triggerAuthGate("report inappropriate content");
      return;
    }
    setReportCategory(null);
    setReportStep(1);
    setReportReason('');
    setHasReported(false);
    setShowReportModal(true);
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reportCategory) return;
    setIsSubmittingReport(true);
    try {
      // Basic rate limiting: check if user hasn't spammed reports recently (optional but good practice)
      const fullReason = `[${reportCategory.priority}] ${reportCategory.label}${reportReason.trim() ? `\n\nDetails: ${reportReason.trim()}` : ''}`;
      
      const sessionData = await supabase.auth.getSession();
      const sessionToken = sessionData.data.session?.access_token;

      const response = await fetch('/api/engagement/report', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ videoId: video.id, reason: fullReason })
      });

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : null;

      if (!response.ok || !data || !data.success) {
        throw new Error(data?.error || `Server responded with status ${response.status}`);
      }
      
      setHasReported(true);
    } catch (err: any) {
      alert(err.message || "Error submitting report. Please try again later.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div ref={setRefs} className="relative w-full h-full snap-start snap-always bg-zinc-900 group shrink-0 overflow-hidden">
      {/* Video Element */}
      {isNearView ? (
        resolvedVideoUrl && !hasError ? (
          <>
          <video
            ref={videoRef}
            poster={video.thumbnail_url || resolvedVideoUrl.replace('/playlist.m3u8', '/thumbnail.jpg')}
            loop
            playsInline
            muted={isMuted}
            className={cn("size-full object-cover transition-opacity duration-300", isBuffering ? "opacity-0" : "opacity-100")}
            onClick={handleVideoClick}
            onError={(e) => {
              console.warn('Native video error:', e);
              setHasError(true);
              setIsBuffering(false);
            }}
            onLoadStart={() => setIsBuffering(true)}
            onCanPlay={() => setIsBuffering(false)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onTimeUpdate={(e) => {
              if (!isScrubbing) {
                setCurrentTime(e.currentTarget.currentTime);
              }
            }}
            onDurationChange={(e) => {
              setDuration(e.currentTarget.duration);
            }}
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration);
            }}
          />
          {/* Skeleton Loader / Poster */}
          {isBuffering && (
            <div className="absolute inset-0 z-0 bg-zinc-900 flex items-center justify-center pointer-events-auto">
              <img 
                src={video.thumbnail_url || resolvedVideoUrl.replace('/playlist.m3u8', '/thumbnail.jpg')}
                alt="Thumbnail"
                className="absolute inset-0 size-full object-cover opacity-50 blur-[2px]"
              />
              <div className="absolute inset-0 bg-zinc-900/30 animate-pulse pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center gap-6">
                {!showSlowConnectionToast ? (
                  <Loader2 className="size-10 text-white/50 animate-spin" />
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/80 backdrop-blur-md rounded-2xl px-5 py-4 flex flex-col items-center gap-3 border border-white/10 shadow-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 text-white/50 animate-spin" />
                      <p className="text-white/90 text-sm font-medium">Reconnecting...</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHasError(true);
                        setTimeout(() => {
                           setRetryCount(0); // reset
                           setHasError(false);
                           setIsBuffering(true);
                        }, 50);
                      }}
                      className="px-5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-bold transition-colors"
                    >
                      Retry Connection
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 z-0 bg-zinc-900 flex flex-col items-center justify-center pointer-events-auto">
          <img 
            src={video.thumbnail_url || resolvedVideoUrl?.replace('/playlist.m3u8', '/thumbnail.jpg') || ''}
            alt="Thumbnail"
            className="absolute inset-0 size-full object-cover opacity-30 blur-[4px]"
          />
          <div className="absolute inset-0 bg-zinc-900/40 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center gap-y-3">
             {retryCount >= 3 ? (
               <>
                 <AlertOctagon className="size-10 text-white/40 mb-2" />
                 <p className="text-sm font-medium text-white/80 tracking-wide drop-shadow-md">Video unavailable</p>
                 <button type="button" aria-label="button"  
                    onClick={(e) => {
                      e.stopPropagation();
                      setRetryCount(0);
                      setHasError(false);
                      setIsBuffering(true);
                    }} 
                    className="mt-2 px-4 py-1.5 bg-white/10 text-white rounded-full font-medium text-xs hover:bg-white/20 transition-colors border border-white/10"
                 >
                    Retry
                 </button>
               </>
             ) : (
               <>
                 <Loader2 className="size-8 text-white/60 animate-spin" />
                 <p className="text-xs font-medium text-white/80 tracking-wide drop-shadow-md">Getting video ready...</p>
               </>
             )}
          </div>
        </div>
      )) : (
        <div className="absolute inset-0 z-0 bg-zinc-900">
          <img 
            src={video.thumbnail_url || resolvedVideoUrl.replace('/playlist.m3u8', '/thumbnail.jpg')}
            alt="Thumbnail"
            className="size-full object-cover opacity-50"
          />
        </div>
      )}

      {/* Play/Pause Overlay */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 gap-4">
          <button type="button" aria-label="button"  
            onClick={(e) => { e.stopPropagation(); toggleMute(e); }}
            className="size-12 shrink-0 bg-[#0c0c0e]/40 backdrop-blur-md rounded-full text-white/90 hover:bg-[#0c0c0e]/60 transition-colors pointer-events-auto cursor-pointer flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10"
          >
            {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <button type="button" aria-label="button"  
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="size-12 shrink-0 bg-[#0c0c0e]/40 backdrop-blur-md rounded-full text-white/90 hover:bg-[#0c0c0e]/60 transition-colors pointer-events-auto cursor-pointer flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10"
          >
            <Play className="size-6 text-white/90 fill-white/90 ml-1" />
          </button>
        </div>
      )}

      {/* Double Click Heart Animation */}
      <AnimatePresence>
        {showHeartAnim && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
            animate={{ scale: 1.5, opacity: 1, rotate: 0 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <Heart className="size-32 text-red-500 fill-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Gradient overlay - lighter gradient for readability without darkening */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none z-0" />

      {/* Content Overlay */}
      <div className="absolute bottom-[80px] left-3 right-16 flex flex-col justify-end pointer-events-none z-10 pb-safe">
        
        {/* Information Container */}
        <div className="flex flex-col mb-1.5 pointer-events-auto max-w-[90%]">
          
          <div className="mb-1.5 flex items-center gap-2 flex-wrap">
            {video.categories && (
              <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center">
                <Tag className="size-3 mr-1" />
                {video.categories.name}
              </span>
            )}
            {video.product_url && (
              <span className="px-2 py-0.5 bg-[#ef2950] border border-[#ef2950] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center rounded">
                <ShoppingBag className="size-3 mr-1" />
                {extractStoreName(video.product_url)}
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-y-1">
            <span className="text-white font-sans font-bold text-[15px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              @{video.profiles?.username || (video as any).public_profiles?.username || 'user'}
            </span>
            {(video.profiles?.is_brand || (video as any).public_profiles?.is_brand) && (
              <BadgeCheck className="size-[15px] text-[#3897f0] ml-1 shrink-0 drop-shadow-sm" fill="currentColor" strokeWidth={0} />
            )}
            {/* Inline dynamic follow/you action badge next to username */}
            {(!user || video.user_id !== user?.id) ? (
              <button type="button" aria-label="button" 
                onClick={handleFollowToggle}
                disabled={isFollowingLoading}
                className={cn(
                  "ml-3 px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide transition-all duration-200 pointer-events-auto border",
                  isFollowing 
                    ? "bg-white/10 text-white/50 border-white/10" 
                    : "bg-[#ef2950] hover:bg-[#ff3b61] text-white border-transparent shadow-sm active:scale-95"
                )}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            ) : (
              <span className="ml-2.5 px-1.5 py-0.5 bg-white/10 text-white/70 rounded text-[9.5px] font-bold uppercase tracking-wider border border-white/5">
                You
              </span>
            )}
          </div>

          {/* Caption */}
          {parsedProduct.captionText && (
            <div className="mt-2 text-left pointer-events-auto">
              <p 
                className="text-white/95 text-[14px] font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-[1.3] line-clamp-2 font-normal pr-2 whitespace-pre-wrap animate-fadeIn text-left"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parsedProduct.captionText) }}
              />
            </div>
          )}

          {/* Search Metadata & Tags Expandable Section */}
          {(video.tags && video.tags.length > 0) && (
            <div className="mt-2.5 pointer-events-auto">
              <button type="button" 
                onClick={(e) => { e.stopPropagation(); setShowMetadata(!showMetadata); }}
                className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors py-1 text-[12px] font-semibold tracking-wide drop-shadow-sm"
              >
                <Tag className="size-3.5" />
                {showMetadata ? 'Hide Tags' : 'Show Metadata & Tags'}
              </button>
              
              <AnimatePresence>
                {showMetadata && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 flex flex-wrap gap-1.5 max-w-full">
                      {video.tags.map((tag: string, index: number) => {
                         const isHashtag = tag.startsWith('#');
                         return (
                           <span 
                             key={index} 
                             className={cn(
                               "px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide shadow-sm backdrop-blur-md border",
                               isHashtag 
                                 ? "bg-purple-500/20 text-purple-200 border-purple-500/30" 
                                 : "bg-white/10 text-white/90 border-white/10"
                             )}
                           >
                             {tag}
                           </span>
                         );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Product CTA (Reels style card) */}
          {video.product_url && (
            <div className="flex flex-col gap-2 mt-4 pointer-events-auto">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailsActiveSection('main');
                  setShowProductDetails(true);
                }}
                className="group flex items-center bg-[#0c0c0e]/45 hover:bg-[#0c0c0e]/60 backdrop-blur-md rounded-xl p-1.5 pr-4 w-fit border border-white/10 transition-colors shadow-md text-left"
              >
                <div className="size-10 rounded-lg bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center mr-3 border border-white/5">
                   <img src={video.main_product_image_url || video.thumbnail_url || "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=150&q=80"} alt="Product" className="size-full object-cover animate-fadeIn" />
                </div>
                <div className="flex flex-col items-start justify-center max-w-[170px]">
                   <span className="text-[13px] font-sans font-semibold text-white/95 leading-tight truncate w-full">
                     {parsedProduct.productName || "Linked Product"}
                   </span>
                   <span className="text-[12px] font-sans text-rose-450 font-bold mt-0.5">
                     {parsedProduct.productPrice ? `₹${parsedProduct.productPrice.toLocaleString('en-IN')}` : "View Details"}
                   </span>
                </div>
              </motion.button>

              {parsedProduct.couponCode && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailsActiveSection('coupon');
                    setShowProductDetails(true);
                  }}
                  className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-555/20 backdrop-blur-md text-emerald-400 font-bold border border-emerald-500/25 px-2.5 py-1 rounded-lg w-fit text-[11px] uppercase tracking-wider shadow-sm transition-all animate-fadeIn"
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <span>Use Coupon: {parsedProduct.couponCode}</span>
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side Action Buttons */}
      <div className="absolute bottom-[80px] right-2 w-14 flex flex-col items-center gap-y-[18px] z-20 pointer-events-auto pb-safe">
        
        {/* Avatar */}
        <div className="relative mb-1">
          <div className="size-[42px] rounded-full border-[1.5px] border-white/80 bg-[#1c1c1e] overflow-hidden shrink-0 shadow-sm flex flex-col justify-center items-center">
            {video.profiles?.avatar_url ? (
              <img src={video.profiles.avatar_url} alt={video.profiles.username} className="size-full object-cover relative z-10" />
            ) : (
              <div className="size-full flex items-center justify-center text-white font-serif italic text-[14px] font-medium bg-zinc-800 relative z-10">
                {video.profiles?.username?.charAt(0).toLowerCase() || 'v'}
              </div>
            )}
          </div>
          {/* Follow toggle on avatar: only show if uploader !== viewer and is not following */}
          {(!user || video.user_id !== user.id) && !isFollowing && (
            <button type="button" aria-label="button" 
              onClick={handleFollowToggle}
              disabled={isFollowingLoading}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-5 rounded-full bg-[#ef2950] text-white flex items-center justify-center shadow-md border-[1.5px] border-black transition-transform active:scale-95 z-20"
            >
               <Plus className="size-3" strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Like Button */}
        <button type="button" aria-label="button"  
          onClick={handleLikeToggle}
          className="flex flex-col items-center group active:scale-95 transition-transform"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill={isLiked ? "#ef2950" : "white"} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span className="text-white font-sans text-[12px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-0.5 tracking-tight text-center w-full">
            {likesCount >= 1000000 ? (likesCount / 1000000).toFixed(1) + 'M' : likesCount >= 1000 ? (likesCount / 1000).toFixed(1) + 'K' : likesCount}
          </span>
        </button>

        {/* Comment Button */}
        <button type="button" aria-label="Comment"  
          onClick={() => setShowCommentDrawer(true)}
          className="flex flex-col items-center group active:scale-95 transition-transform"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z"/>
          </svg>
          <span className="text-white font-sans text-[12px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-0.5 tracking-tight text-center w-full">
            {commentsCount >= 1000000 ? (commentsCount / 1000000).toFixed(1) + 'M' : commentsCount >= 1000 ? (commentsCount / 1000).toFixed(1) + 'K' : commentsCount}
          </span>
        </button>

        {/* Save/Bookmark Button */}
        <button type="button" aria-label="button"  
          onClick={handleBookmarkToggle}
          className="flex flex-col items-center group active:scale-95 transition-transform"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill={isSaved ? "#facc15" : "white"} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
          <span className="text-white font-sans text-[12px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-0.5 tracking-tight text-center w-full">
            {savesCount >= 1000000 ? (savesCount / 1000000).toFixed(1) + 'M' : savesCount >= 1000 ? (savesCount / 1000).toFixed(1) + 'K' : savesCount}
          </span>
        </button>

        {/* Share Button */}
        <button type="button" aria-label="button"  
          onClick={handleShare}
          className="flex flex-col items-center group active:scale-95 transition-transform"
          disabled={isSharing}
        >
          {isSharing ? (
            <Loader2 className="size-7 text-white animate-spin drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
               <path d="M21 12l-7-7v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19l7-7z"/>
            </svg>
          )}
          <span className="text-white font-sans text-[12px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-0.5 tracking-tight text-center w-full">
            {isSharing ? 'Wait...' : 'Share'}
          </span>
        </button>

        {/* Report Button */}
        <button type="button" aria-label="button"  
          onClick={handleReport}
          className="flex flex-col items-center group active:scale-95 transition-transform"
        >
          <Flag className="size-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] p-[1px]" fill="currentColor" />
          <span className="text-white font-sans text-[12px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-0.5 tracking-tight text-center w-full">
            Report
          </span>
        </button>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0c0c0e]/60 backdrop-blur-sm pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); setShowReportModal(false); }}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0c0c0e] sm:border border-zinc-800 sm:rounded-3xl rounded-t-[32px] w-full max-w-md shadow-2xl relative flex flex-col h-[85vh] sm:max-h-[80vh]"
            >
              {/* Header */}
              <div className="flex items-center p-4 pt-6 shrink-0 relative">
                <button type="button" aria-label="button"  
                  onClick={() => setShowReportModal(false)}
                  className="absolute left-4 p-2 -ml-2 text-white/90 hover:text-white transition-colors"
                >
                   <ArrowLeft className="size-6" strokeWidth={2} />
                </button>
                <div className="flex-1 text-center flex justify-center w-full">
                   <h2 className="text-[17px] font-medium text-white tracking-wide">Report Content</h2>
                </div>
              </div>

              {hasReported ? (
                  <div className="flex-1 overflow-y-auto overscroll-contain">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-20 px-6 text-center"
                    >
                      <motion.div 
                        className="size-20 bg-green-500/10 rounded-full flex items-center justify-center relative mb-6"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      >
                        <motion.div 
                          className="absolute inset-0 bg-green-500/20 rounded-full"
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <ShieldCheck className="size-10 text-green-500 relative z-10" />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Thanks for your report</h3>
                        <p className="text-zinc-400 text-[15px] max-w-[280px] mx-auto leading-relaxed">
                          You're helping keep Getnayi a safe community.
                        </p>
                      </motion.div>
                      
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        onClick={() => setShowReportModal(false)}
                        className="mt-8 px-8 py-3 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl transition-colors active:scale-95"
                      >
                        Done
                      </motion.button>
                    </motion.div>
                  </div>
                ) : (
                  <>
                    <div className="px-5 pt-3 mb-4 shrink-0">
                       <h3 className="text-[15px] font-medium text-white tracking-wide">Why are you reporting this?</h3>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-6 flex flex-col">
                       <div className="flex flex-col gap-y-3">
                          {REPORT_CATEGORIES.map((category) => (
                            <button type="button" aria-label="button" 
                              key={category.id}
                              onClick={() => setReportCategory(category as any)}
                              className={`w-full flex items-center p-4 bg-[#151518] rounded-xl transition-all group text-left border ${reportCategory?.id === category.id ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/5 hover:border-white/10'}`}
                            >
                              <div className={`w-[26px] h-[26px] rounded-full border-2 ${reportCategory?.id === category.id ? 'border-orange-500 text-orange-500' : 'border-[#ef2950]/80 text-[#ef2950]/80'} flex items-center justify-center shrink-0 mr-4 transition-colors`}>
                                  <div className="size-[10px] rounded-full border-2 border-current" />
                              </div>
                              <div>
                                <div className="font-medium text-[15px] text-white/90 tracking-wide mb-0.5">
                                  {category.label}
                                </div>
                                <div className="text-[13px] text-zinc-500 tracking-wide">{category.description}</div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Footer Submit Button */}
                    <div className="px-5 pt-4 pb-[calc(24px+env(safe-area-inset-bottom))] bg-[#0c0c0e] shrink-0 border-t border-transparent">
                       <button type="button" aria-label="button" 
                         onClick={submitReport}
                         disabled={!reportCategory || isSubmittingReport}
                         className="w-full py-[18px] bg-[#ef2950] text-white font-semibold text-[16px] tracking-wide rounded-2xl flex items-center justify-center hover:bg-[#ef2950]/90 transition-colors active:scale-[0.98] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                          {isSubmittingReport ? <Loader2 className="size-5 animate-spin" /> : 'Submit Report'}
                       </button>
                    </div>
                  </>
                )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Product Details Drawer */}
      <AnimatePresence>
        {showProductDetails && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-[60] bg-[#0c0c0e] flex flex-col pointer-events-auto overflow-hidden animate-fadeIn"
            onClick={(e) => { e.stopPropagation(); }}
          >
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto w-full flex flex-col pb-[calc(2em+env(safe-area-inset-bottom))]">
               
               {/* Hero Image Section */}
               <div className="relative w-full aspect-[4/5] bg-zinc-950 shrink-0 rounded-b-3xl overflow-hidden shadow-lg">
                 <img 
                   src={video.main_product_image_url || video.thumbnail_url || "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80"}
                   className="absolute inset-0 size-full object-cover"
                   alt="Product"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-transparent to-black/35 pointer-events-none" />
                 
                 {/* Top Navigation Overlay */}
                 <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] flex justify-between items-start z-10">
                   <button type="button" aria-label="button"  
                     onClick={() => { setShowProductDetails(false); }}
                     className="size-10 flex items-center justify-center text-white bg-[#0c0c0e]/45 rounded-full backdrop-blur-md border border-white/5 hover:bg-[#0c0c0e]/60 active:scale-95 transition-all shadow-md"
                   >
                     <ChevronLeft className="size-6" strokeWidth={2.5} />
                   </button>
                   <button type="button" aria-label="button"  
                     onClick={() => alert("Options coming soon")} 
                     className="size-10 flex items-center justify-center text-white bg-[#0c0c0e]/45 rounded-full backdrop-blur-md border border-white/5 hover:bg-[#0c0c0e]/60 active:scale-95 transition-all shadow-md"
                   >
                     <MoreHorizontal className="size-5" />
                   </button>
                 </div>
               </div>

               {/* Details Section */}
               <div className="px-5 pt-5 pb-8 flex flex-col">
                 <h1 className="text-[23px] font-sans font-bold text-white tracking-tight leading-snug">
                   {parsedProduct.productName || "Linked Product"}
                 </h1>
                 
                 <p className="text-[14px] text-zinc-500 mt-1 font-sans tracking-wide">
                   Recommended product by <span className="font-semibold text-[#ef2950]">@{video.profiles?.username || 'Creator'}</span>
                 </p>

                 <div className="flex items-center justify-between mt-3 mb-1">
                   {parsedProduct.productPrice ? (
                     <div className="flex flex-col">
                       <span className="text-[28px] font-extrabold text-white font-mono tracking-tight">
                         ₹{parsedProduct.productPrice.toLocaleString('en-IN')}
                       </span>
                       <span className="text-[11px] text-[#ef2950] font-sans font-medium uppercase tracking-wider mt-0.5">Special Creator Price</span>
                     </div>
                   ) : (
                     <span className="text-[20px] font-sans font-bold text-zinc-400">Verified Deal</span>
                   )}
                   <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-full px-2.5 py-1 text-[11px] text-zinc-400 font-medium">
                      <Star className="size-3 text-amber-400 fill-amber-400" />
                      <span>Creator Vouched</span>
                   </div>
                 </div>

                 {/* Authentic Product Link Badge */}
                 <div className="flex flex-col gap-y-2 mt-4">
                   <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center shadow-sm w-fit">
                      <BadgeCheck className="size-4 text-emerald-400 mr-2" />
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Verified Authentic eComm Store Link</span>
                   </div>
                   {video.is_admin_verified_link && (
                     <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 flex flex-col shadow-sm w-fit">
                        <div className="flex items-center">
                          <ShieldCheck className="size-4 text-blue-400 mr-2" />
                          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Admin Verified Link</span>
                        </div>
                        <span className="text-[10px] text-blue-400/80 mt-1 font-medium">* This implies the website looks legitimate based on manual review.</span>
                     </div>
                   )}
                 </div>

                 {/* Description "Why recommends it" */}
                 {parsedProduct.captionText && (
                   <div className="mt-6 bg-[#151518]/60 border border-white/5 rounded-2xl p-4">
                     <span className="text-xs font-bold uppercase tracking-wider text-[#ef2950] font-sans block mb-2">Why I Recommend This</span>
                     <p className="text-[14.5px] text-zinc-300 leading-relaxed font-sans font-normal tracking-wide pl-0.5">
                       {parsedProduct.captionText}
                     </p>
                   </div>
                 )}

                 {/* Real Life Photos Carousel */}
                 <div className="mt-8 border-t border-zinc-900 pt-6">
                   <div className="flex items-center justify-between mb-3">
                     <h3 className="text-[15px] font-bold text-white tracking-wide">Product Looks</h3>
                     <span className="text-[11px] text-zinc-500 font-medium font-sans flex items-center gap-1.5 bg-white/5 px-2.5 py-0.75 rounded-full select-none">
                       <Maximize2 className="size-2.5 text-zinc-400" />
                       <span>Tap image for full screen</span>
                     </span>
                   </div>
                   <div className="flex gap-x-3 overflow-x-auto pb-2 scrollbar-none snap-x h-[140px]">
                     <button
                       type="button"
                       onClick={() => setFullscreenImageUrl(video.main_product_image_url || video.thumbnail_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop")}
                       className="w-[110px] h-full rounded-2xl bg-zinc-950 overflow-hidden shrink-0 snap-start border border-white/5 shadow-sm relative group cursor-pointer hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-left p-0"
                     >
                        <img src={video.main_product_image_url || video.thumbnail_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop"} className="size-full object-contain bg-black/40 transition-transform group-hover:scale-105 duration-300"  alt="" />
                        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-[#0c0c0e]/75 backdrop-blur-sm rounded text-[9px] text-white font-medium border border-white/5">Official</span>
                     </button>
                     {video.real_life_image_url && (
                       <button
                         type="button"
                         onClick={() => setFullscreenImageUrl(video.real_life_image_url)}
                         className="w-[110px] h-full rounded-2xl bg-zinc-950 overflow-hidden shrink-0 snap-start border border-white/5 shadow-sm relative group cursor-pointer hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-left p-0"
                       >
                          <img src={video.real_life_image_url} className="size-full object-contain bg-black/40 transition-transform group-hover:scale-105 duration-300"  alt="" />
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-[#ef2950]/90 backdrop-blur-sm rounded text-[9px] text-white font-bold uppercase tracking-wider border border-[#ef2950]/10">Real Pic</span>
                       </button>
                     )}
                   </div>
                 </div>

                 {/* Dynamic Coupon Area with highlighting pulse if targeted */}
                 {parsedProduct.couponCode && (
                   <div 
                     className={cn(
                       "mt-8 p-5 rounded-2xl border-2 border-dashed transition-all duration-500",
                       detailsActiveSection === 'coupon' 
                         ? "bg-emerald-500/10 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse" 
                         : "bg-[#151518] border-zinc-800"
                     )}
                   >
                     <div className="flex items-center gap-2 text-emerald-400 font-bold text-[14px] uppercase tracking-wider mb-2.5">
                       <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                       </svg>
                       <span>Exclusive Discount Match</span>
                     </div>
                     
                     <div className="flex gap-3 bg-zinc-950/80 border border-white/5 p-3 rounded-xl items-center justify-between mb-4">
                       <div className="flex flex-col">
                         <span className="text-[12px] text-zinc-500 uppercase tracking-widest font-mono">Promo Coupon Code</span>
                         <span className="text-[18px] font-extrabold text-[#11b981] font-mono tracking-wider">{parsedProduct.couponCode}</span>
                       </div>
                       
                       <button type="button" aria-label="button" 
                         onClick={(e) => {
                           e.stopPropagation();
                           navigator.clipboard.writeText(parsedProduct.couponCode || '');
                           setIsCopied(true);
                           setTimeout(() => { setIsCopied(false); }, 2000);
                         }}
                         className={cn(
                           "px-4 py-2 text-[12.5px] font-bold rounded-lg transition-all scale-active",
                           isCopied 
                             ? "bg-emerald-500 text-white" 
                             : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/15"
                         )}
                       >
                         {isCopied ? 'Copied ✓' : 'Copy Code'}
                       </button>
                     </div>

                     {parsedProduct.couponInstructions && (
                       <p className="text-xs text-zinc-400 leading-relaxed mb-2 flex items-start gap-1.5">
                         <span className="text-emerald-400 shrink-0 font-bold">Directions:</span>
                         <span>{parsedProduct.couponInstructions}</span>
                       </p>
                     )}

                     {parsedProduct.couponTerms && (
                       <p className="text-[11px] text-zinc-500 leading-relaxed pl-1.5 border-l border-zinc-800">
                         * Terms: {parsedProduct.couponTerms}
                       </p>
                     )}
                   </div>
                 )}

                 {/* Structured Specifications Lists: Uses, Specs, Benefits */}
                 {(parsedProduct.productUses.length > 0 || parsedProduct.keySpecifications.length > 0 || parsedProduct.benefits.length > 0) && (
                   <div className="mt-8 border-t border-zinc-900 pt-6 gap-y-6">
                     <h3 className="text-[16px] font-bold text-white mb-2 tracking-wide font-sans">Product Breakdown</h3>
                     
                     {/* Product Uses Block */}
                     {parsedProduct.productUses.length > 0 && (
                       <div className="gap-y-2.5">
                         <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block font-sans">Tested Use Cases</span>
                         <div className="text-[14px] text-zinc-300 leading-relaxed gap-y-2 pl-0.5">
                           {parsedProduct.productUses.map((line, idx) => (
                             <div key={idx} className="flex items-start gap-2.5">
                               <div className="size-[18px] rounded-full bg-[#ef2950]/10 border border-[#ef2950]/20 flex items-center justify-center shrink-0 mt-0.5">
                                 <svg className="size-2.5 text-[#ef2950]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                 </svg>
                               </div>
                               <span>{line.replace(/^•\s*/, '')}</span>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* Key Specifications Table/List */}
                     {parsedProduct.keySpecifications.length > 0 && (
                       <div className="gap-y-2.5 pt-4 border-t border-zinc-900">
                         <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block font-sans">Product Tech Specifications</span>
                         <div className="bg-[#151518]/50 rounded-xl p-3 divide-y divide-zinc-900 text-[13.5px] text-zinc-300">
                           {parsedProduct.keySpecifications.map((spec, idx) => (
                             <div key={idx} className="py-2.5 first:pt-1 last:pb-1 flex items-start gap-2 text-zinc-300 leading-relaxed">
                               <span className="text-zinc-650 shrink-0 font-bold text-[#ef2950]">𐃏</span>
                               <span>{spec.replace(/^•\s*/, '')}</span>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* Key Benefits */}
                     {parsedProduct.benefits.length > 0 && (
                       <div className="gap-y-2.5 pt-4 border-t border-zinc-900">
                         <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block font-sans">Primary Benefits</span>
                         <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/10 text-[14px] text-zinc-300 leading-relaxed gap-y-2">
                           {parsedProduct.benefits.map((benefit, idx) => (
                             <div key={idx} className="flex items-start gap-2.5">
                               <span className="text-emerald-400 shrink-0 font-bold font-sans">✓</span>
                               <span>{benefit.replace(/^•\s*/, '')}</span>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                 {/* Bento specifications: Best For, What I Liked, Things to Know */}
                 {(parsedProduct.bestFor || parsedProduct.whatILiked || parsedProduct.thingsToKnow) && (
                   <div className="mt-8 border-t border-zinc-900 pt-6 grid grid-cols-2 gap-4">
                     {parsedProduct.bestFor && (
                       <div className="bg-[#151518]/45 border border-white/5 rounded-xl p-3.5 col-span-1">
                         <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Recommended Best For</span>
                         <span className="text-[13px] text-zinc-200 font-sans font-semibold leading-snug">{parsedProduct.bestFor}</span>
                       </div>
                     )}

                     {parsedProduct.whatILiked && (
                       <div className="bg-[#151518]/45 border border-white/5 rounded-xl p-3.5 col-span-1">
                         <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Creator Fave Option</span>
                         <span className="text-[13px] text-zinc-200 font-sans font-semibold leading-snug">{parsedProduct.whatILiked}</span>
                       </div>
                     )}

                     {parsedProduct.thingsToKnow && (
                       <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 col-span-2">
                         <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest block mb-1 flex items-center gap-1.5">
                           <AlertOctagon className="size-3.5" />
                           Honest Heads-up / Things to Know
                         </span>
                         <p className="text-[12.5px] text-zinc-300 leading-relaxed font-sans mt-1">{parsedProduct.thingsToKnow}</p>
                       </div>
                     )}
                   </div>
                 )}

               </div>
            </div>

            {/* Sticky Action Button */}
            <div className="p-4 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/95 to-transparent shrink-0 border-t border-white/5 bg-[#0c0c0e]">
               <button
                 type="button"
                 onClick={() => setShowPurchaseDisclaimer(true)}
                 className="w-full bg-[#ef2950] hover:bg-[#ff3b61] active:scale-[0.98] text-white font-bold py-4.5 px-6 rounded-2xl transition-all flex items-center justify-center text-[16px] shadow-[0_4px_15px_rgba(239,41,80,0.45)] tracking-wide shrink-0 cursor-pointer"
               >
                 Buy from {extractStoreName(video.product_url) || "Store"}
               </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Gate Announcement Dialog */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); }}
          >
             <GuestGate type="action" onClose={() => setShowAuthModal(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purchase Disclaimer Dialog */}
      <AnimatePresence>
        {showPurchaseDisclaimer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[75] bg-[#0c0c0e]/85 backdrop-blur-md pointer-events-auto flex flex-col justify-end"
            onClick={(e) => { e.stopPropagation(); setShowPurchaseDisclaimer(false); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full bg-[#131316] border-t border-white/5 rounded-t-[24px] shadow-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col pointer-events-auto max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-5 shrink-0">
                <div className="flex items-center gap-2.5 text-amber-500">
                  <ShieldAlert className="size-5.5 text-amber-500" strokeWidth={2.5} />
                  <h3 className="text-[17px] font-bold text-white tracking-tight">Purchase Disclaimer</h3>
                </div>
                <button type="button" aria-label="Close"  
                  onClick={() => setShowPurchaseDisclaimer(false)}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              {/* Disclaimer Body */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1 text-left">
                <p className="text-zinc-300 text-[13px] leading-relaxed font-sans">
                  Getnayi is a hands-on video discovery platform showcasing authentic product reviews and styling recommendations. We are not an e-commerce store, and we do not process sales or payments directly.
                </p>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2.5">
                  <p className="text-amber-400 text-[13px] font-bold leading-normal">
                    Important Terms & Information:
                  </p>
                  <ul className="text-zinc-300 text-[12.5px] leading-relaxed pl-4 list-disc space-y-2 font-sans">
                    <li>
                      <span className="text-[#ef2950] font-semibold">Redirect Notice:</span> You will be redirected to <span className="text-white font-semibold font-mono">{extractStoreName(video.product_url) || "the external website"}</span> to purchase the product.
                    </li>
                    <li>
                      <span className="text-white font-semibold">No Platform Liability:</span> We are <span className="text-[#ef2950] font-bold">not responsible</span> for any fraud, delayed shipping, payment errors, transit damage, or item quality.
                    </li>
                    <li>
                      <span className="text-white font-semibold">Returns & Refunds:</span> All cancellation requests, returns, refunds, or support queries are the entire, sole responsibility of the merchant store and the brand/influencer who uploaded this link.
                    </li>
                  </ul>
                </div>
                
                <p className="text-zinc-500 text-[11px] leading-normal font-sans">
                  By clicking "Proceed to Store", you confirm you understand and agree that any subsequent purchase or payment is done entirely at your own risk.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 shrink-0">
                <a
                  href={video.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowPurchaseDisclaimer(false)}
                  className="w-full bg-[#ef2950] hover:bg-[#ff3b61] active:scale-[0.98] text-white text-[15px] font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(239,41,80,0.3)] cursor-pointer"
                >
                  <span>Proceed to {extractStoreName(video.product_url) || "Store"}</span>
                  <ChevronRight className="size-4" strokeWidth={2.5} />
                </a>

                <button
                  type="button"
                  onClick={() => setShowPurchaseDisclaimer(false)}
                  className="w-full bg-[#1c1c21] hover:bg-zinc-800 text-zinc-300 text-[14px] font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center border border-white/5 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showVerifiedInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-[#0c0c0e]/60 backdrop-blur-sm pointer-events-auto"
            onClick={(e) => { e.stopPropagation(); setShowVerifiedInfo(false); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl shadow-2xl p-6 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center text-gold">
                  <BadgeCheck className="size-6 mr-2" strokeWidth={2.5} />
                  <h3 className="text-xl font-bold text-white tracking-tight">Verified Hands-On</h3>
                </div>
                <button type="button" aria-label="button"  
                  onClick={() => setShowVerifiedInfo(false)}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors bg-zinc-800 rounded-full"
                >
                  <X className="size-5" />
                </button>
              </div>
              <p className="text-zinc-300 leading-relaxed mb-6">
                This creator uploaded a real-life photo to prove they actually use this product. You can view their photo in the product details.
              </p>
              <button type="button" aria-label="button" 
                onClick={() => setShowVerifiedInfo(false)}
                className="w-full bg-[#4A63F3] hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg active:scale-[0.98]"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Image Viewer Modal */}
      <AnimatePresence>
        {fullscreenImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center pointer-events-auto cursor-zoom-out"
            onClick={(e) => { e.stopPropagation(); setFullscreenImageUrl(null); }}
          >
            {/* Top Close Bar */}
            <div className="absolute top-6 left-0 right-0 px-6 flex items-center justify-between pointer-events-none z-10">
              <span className="text-[12px] font-semibold text-zinc-300 select-none bg-zinc-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
                Full Screen View
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFullscreenImageUrl(null); }}
                className="size-11 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-full border border-white/15 cursor-pointer pointer-events-auto shadow-2xl"
              >
                <X className="size-5.5" />
              </button>
            </div>

            {/* Central Image Container */}
            <motion.div
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="p-4 w-full h-full max-w-[100vw] max-h-[100vh] flex items-center justify-center pointer-events-none"
            >
              <img
                src={fullscreenImageUrl}
                alt="Product visual full screen"
                className="max-w-[95vw] max-h-[80vh] w-auto h-auto object-contain aspect-auto rounded-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.9)] pointer-events-auto select-none"
                onPointerDown={(e) => e.stopPropagation()}
                role="presentation"
              />
            </motion.div>

            {/* Tap to close hint */}
            <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none select-none z-10">
              <span className="text-zinc-400 text-[11.5px] tracking-wider uppercase font-semibold bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 shadow-md">
                Tap anywhere to exit
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Seeker Progress Bar */}
      {resolvedVideoUrl && !hasError && (
        <div 
          className="absolute bottom-[calc(60px+env(safe-area-inset-bottom)-6px)] left-0 right-0 z-30 px-0 py-0 flex flex-col pointer-events-auto select-none bg-gradient-to-t from-black/40 to-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress track container */}
          <div 
            ref={timelineRef}
            onPointerDown={handlePointerDown}
            className="relative w-full flex items-center group/timeline h-6 cursor-pointer touch-none"
          >
            {/* Custom styled progress rail with smooth radial glow */}
            <div className={`relative w-full overflow-hidden transition-all duration-300 ease-out pointer-events-none ${isScrubbing ? 'h-1.5 ring-2 ring-[#ef2950]/45 shadow-[0_0_15px_rgba(239,41,80,0.7)] bg-white/30' : 'h-1 bg-white/20 group-hover/timeline:h-1.5 shadow-[0_0_0px_rgba(239,41,80,0)]'}`}>
              {/* Highlight active progress */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-[#ef2950] pointer-events-none"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            
            {/* Dynamic seeker knob */}
            <div 
              className={`absolute size-3 bg-white rounded-full border border-[#ef2950] origin-center transition-all duration-100 pointer-events-none -translate-x-1/2 ${isScrubbing ? 'scale-125 ring-2 ring-white/50 shadow-[0_0_12px_rgba(239,41,80,0.8)]' : 'scale-0 group-hover/timeline:scale-100 shadow-md'}`}
              style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Comment Drawer Overlay */}
      <AnimatePresence>
        {showCommentDrawer && (
          <CommentDrawer
            videoId={video.id}
            videoOwnerId={video.user_id}
            onClose={() => setShowCommentDrawer(false)}
            onCommentsCountChange={setCommentsCount}
            onAuthRequired={triggerAuthGate}
          />
        )}
      </AnimatePresence>

      {/* Share Drawer Overlay */}
      <ShareDrawer
        isOpen={showShareDrawer}
        onClose={() => setShowShareDrawer(false)}
        url={shareUrl || `${window.location.origin}/video/${video.id}`}
        title={video.caption ? `${video.caption} | Getnayi` : 'Check out this video | Getnayi'}
      />

    </div>
  );
});
