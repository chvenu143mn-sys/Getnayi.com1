import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import DOMPurify from 'dompurify';
import { ShoppingBag, ShoppingCart, Play, Volume2, VolumeX, Heart, Share2, Flag, X, AlertOctagon, MessageCircle, Send, BadgeCheck, ShieldCheck, Trash2, Loader2, ChevronRight, ArrowLeft, ShieldAlert, Bookmark, Disc, Plus, ChevronLeft, MoreHorizontal, Star, Link as LinkIcon, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Hls from 'hls.js';
import { Video } from '../types';
import { GuestGate } from './GuestGate';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { parseVideoProduct, formatINR } from '../utils/videoUtils';

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

export const VideoPlayer = React.memo(function VideoPlayer({ video, isActive: isParentActive }: VideoPlayerProps) {
  const parsedProduct = parseVideoProduct(video.caption);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(getGlobalMuted());
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [savesCount, setSavesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(video.views || 0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showVerifiedInfo, setShowVerifiedInfo] = useState(false);
  
  // View count tracker (true if already viewed in DB or this session)
  const [hasViewedLocallyThisSession, setHasViewedLocallyThisSession] = useState(false);

  // useInView for Feed Intersection
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.6,
  });

  const { ref: nearViewRef, inView: isNearView } = useInView({
    rootMargin: '1200px 0px', // Preload videos up to 1200px (approx 1 screen) away
  });

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      inViewRef(node);
      nearViewRef(node);
    },
    [inViewRef, nearViewRef]
  );

  // Calculate actual active state
  const isActive = isParentActive && inView;

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
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState('');

  const triggerAuthGate = (actionReason: string) => {
    setAuthModalReason(actionReason);
    setShowAuthModal(true);
  };

  const getAuthModalIcon = () => {
    if (authModalReason.includes('like')) {
      return (
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center animate-bounce mb-4 mx-auto">
          <Heart className="w-8 h-8 fill-red-500 text-red-500" />
        </div>
      );
    }

    if (authModalReason.includes('share')) {
      return (
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center animate-bounce mb-4 mx-auto">
          <Share2 className="w-8 h-8 text-emerald-500" />
        </div>
      );
    }
    if (authModalReason.includes('product')) {
      return (
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center animate-bounce mb-4 mx-auto">
          <ShoppingBag className="w-8 h-8 text-indigo-500" />
        </div>
      );
    }
    return (
      <div className="w-16 h-16 bg-white/10 text-white rounded-full flex items-center justify-center animate-bounce mb-4 mx-auto">
        <BadgeCheck className="w-8 h-8 text-white" />
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
      // Do not count guest user views as explicitly requested
      if (!user) {
        return;
      }

      viewTimer = setTimeout(() => {
          const incrementViews = async () => {
            try {
              // Retrieve the client device IP address
              let ipAddress = '';
              try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                if (ipRes.ok) {
                  const ipData = await ipRes.json();
                  ipAddress = ipData.ip;
                }
              } catch (ipFetchErr) {
                 console.warn("Failed to get device IP, falling back to user ID...", ipFetchErr);
              }

              // Use IP address as the view's unique session token, fallback to user.id if fetch fails
              const token = ipAddress || user.id;

              // Try the highly scalable Redis write-buffer API first (Phases 2 & 3)
              try {
                const response = await fetch(`/api/videos/${video.id}/view`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ session_token: token })
                });

                if (response.ok) {
                  const resData = await response.json();
                  if (resData.success && resData.buffered) {
                    // Cache path was successful! Update state with low latency
                    if (resData.views !== undefined && resData.views !== null) {
                      setViewsCount(resData.views);
                    }
                    setHasViewedLocallyThisSession(true);
                    return;
                  }
                }
              } catch (apiErr) {
                console.warn("View buffering API bypass, falling back to direct db RPC...", apiErr);
              }

              // Pre-check the database to see if we've ALREADY recorded this view for this token
              const { data: existingView, error: checkError } = await supabase
                .from('video_views')
                .select('id')
                .eq('video_id', video.id)
                .eq('session_token', token)
                .maybeSingle();

              if (!checkError && existingView) {
                // We've already viewed it! Just update local state to stop looping and BAIL OUT.
                setHasViewedLocallyThisSession(true);
                return;
              }

              // Call supabase DIRECTLY to increment unique views
              const { error: rpcError } = await supabase.rpc('increment_video_views', { video_id_param: video.id, session_token_param: token });
              if (rpcError) {
                 console.error("RPC Error increment_video_views:", rpcError);
              }

              // Fetch absolute truth count directly from Postgres database table
              const { count: freshViewCount, error: vCountError } = await supabase
                .from('video_views')
                .select('*', { count: 'exact', head: true })
                .eq('video_id', video.id);

              if (!vCountError && freshViewCount !== null) {
                 setViewsCount(freshViewCount);
              }
              setHasViewedLocallyThisSession(true);
            } catch (e) {
              console.error('Error incrementing views', e);
            }
          };
          incrementViews();
      }, 2000); // 2s watch time to count as a view like standard high quality platforms
    }
    
    return () => clearTimeout(viewTimer);
  }, [isActive, isPlaying, hasViewedLocallyThisSession, video.id, user]);

  // Fetch initial likes and comments count
  useEffect(() => {
    const fetchCounts = async () => {
      // Reset view session trackers for the new video
      setHasViewedLocallyThisSession(false);
      try {
        const { count: lCount, error: lError } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', video.id);
          
        if (lError) console.warn("Supabase likes fetch error (maybe run database.sql?):", lError);
        setLikesCount(lCount || 0);

        const { count: sCount, error: sError } = await supabase
          .from('saved_videos')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', video.id);

        if (sError) console.warn("Supabase saved_videos fetch error:", sError);
        setSavesCount(sCount || 0);

        // Fetch fresh views count directly from video_views table just like likes
        const { count: vCount, error: vError } = await supabase
          .from('video_views')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', video.id);
        
        if (!vError && vCount !== null) {
           setViewsCount(vCount);
        } else if (vError) {
           console.warn("Supabase video_views fetch error:", vError);
        }

        // Check if user has already viewed using their device IP address
        if (user) {
          let ipAddress = '';
          try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              ipAddress = ipData.ip;
            }
          } catch (ipFetchErr) {
             console.warn("Failed to get device IP for initial load check", ipFetchErr);
          }

          const token = ipAddress || user.id;
          const { data: viewData, error: viewError } = await supabase
            .from('video_views')
            .select('id')
            .eq('video_id', video.id)
            .eq('session_token', token)
            .maybeSingle();
            
          if (!viewError && viewData) {
            setHasViewedLocallyThisSession(true);
          } else {
            setHasViewedLocallyThisSession(false);
          }
        } else {
          setHasViewedLocallyThisSession(false);
        }

        if (user) {
          const { data, error: userLikeError } = await supabase
            .from('likes')
            .select('id')
            .eq('video_id', video.id)
            .eq('user_id', user.id)
            .maybeSingle(); // maybeSingle instead of single prevents 406 error if not found
            
          if (userLikeError) console.warn("User like fetch error:", userLikeError);
          if (data) setIsLiked(true);

          const { data: savedData, error: userSaveError } = await supabase
            .from('saved_videos')
            .select('id')
            .eq('video_id', video.id)
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (userSaveError) console.warn("User save fetch error:", userSaveError);
          if (savedData) setIsSaved(true);

          if (video.user_id && video.user_id !== user.id) {
            const { data: followData } = await supabase
              .from('follows')
              .select('id')
              .eq('following_id', video.user_id)
              .eq('follower_id', user.id)
              .maybeSingle();
            if (followData) setIsFollowing(true);
          }
        }
      } catch (err) {
        console.error('Error fetching initial counts:', err);
      }
    };
    
    fetchCounts();
  }, [video.id, user]);

  // Handle HLS and Video Source
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !video.video_url || hasError) return;

    let hls: Hls | null = null;
    if (video.video_url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({ maxBufferLength: 30 });
        hls.loadSource(video.video_url);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Could be a 404 still processing. We'll mark as error so user can retry.
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
        videoElement.src = video.video_url;
      }
    } else {
      // Fallback standard video formats
      videoElement.src = video.video_url;
    }

    return () => {
      if (hls) hls.destroy();
      if (videoElement) {
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
      }
    };
  }, [video.video_url, hasError, isNearView]);

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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      triggerAuthGate("like this video");
      return;
    }
    
    if (!isLiked) {
      handleLikeToggle(e);
      // Show big heart animation in center
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1000);
    }
  };

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      triggerAuthGate("like this video");
      return;
    }

    const previousLiked = isLiked;
    setIsLiked(!previousLiked);
    setLikesCount(prev => previousLiked ? prev - 1 : prev + 1);

    // Call API immediately
    try {
      if (!previousLiked) {
        const { error } = await supabase.from('likes').insert({ video_id: video.id, user_id: user.id });
        if (error) {
           console.error("Error inserting like directly:", error);
           if (error.code === 'PGRST205' || error.message?.includes('not find the table')) {
             alert("The 'likes' table is missing in your database! Please open database.sql and execute it in your Supabase SQL Editor to enable likes, views, and comments.");
           }
        }
      } else {
         const { error } = await supabase.from('likes').delete().eq('video_id', video.id).eq('user_id', user.id);
         if (error) {
           console.error("Error deleting like directly:", error);
           if (error.code === 'PGRST205' || error.message?.includes('not find the table')) {
             alert("The 'likes' table is missing! Please execute database.sql in Supabase.");
           }
         }
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
      if (!previousSaved) {
        const { error } = await supabase.from('saved_videos').insert({ video_id: video.id, user_id: user.id });
        if (error) console.error("Error inserting save:", error);
      } else {
        const { error } = await supabase.from('saved_videos').delete().eq('video_id', video.id).eq('user_id', user.id);
        if (error) console.error("Error deleting save:", error);
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
      if (isFollowing) {
        await supabase.from('follows').delete().eq('following_id', video.user_id).eq('follower_id', user.id);
        setIsFollowing(false);
      } else {
        await supabase.from('follows').insert({ following_id: video.user_id, follower_id: user.id });
        setIsFollowing(true);
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
    
    let shareUrl = `${window.location.origin}/video/${video.id}`;
    
    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ longUrl: `/video/${video.id}` })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.shortUrl) {
          shareUrl = `${window.location.origin}${data.shortUrl}`;
        }
      }
    } catch (err) {
      console.warn("Failed to shorten url", err);
    }

    const imageUrl = video.thumbnail_url || video.main_product_image_url;
    
    const shareData: any = {
      title: video.caption ? `${video.caption} | Getnayi` : 'Check out this video | Getnayi',
      text: 'Found this amazing product video on Getnayi!',
      url: shareUrl,
    };

    if (navigator.share) {
      try {
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
        console.log('Share error or canceled', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
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
      
      const { error } = await supabase.from('reports').insert({
        video_id: video.id,
        user_id: user.id,
        reason: fullReason
      });
      if (error) throw error;
      setHasReported(true);
    } catch (err: any) {
      alert("Error submitting report. Please try again later.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div ref={setRefs} className="relative w-full h-full snap-start snap-always bg-zinc-900 group shrink-0">
      {/* Video Element */}
      {isNearView ? (
        video.video_url && !hasError ? (
          <>
          <video
            ref={videoRef}
            poster={video.thumbnail_url || video.video_url.replace('/playlist.m3u8', '/thumbnail.jpg')}
            loop
            playsInline
            muted={isMuted}
            className={cn("w-full h-full object-cover transition-opacity duration-300", isBuffering ? "opacity-0" : "opacity-100")}
            onClick={togglePlay}
            onDoubleClick={handleDoubleClick}
            onError={() => {
              setHasError(true);
              setIsBuffering(false);
            }}
            onLoadStart={() => setIsBuffering(true)}
            onCanPlay={() => setIsBuffering(false)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
          />
          {/* Skeleton Loader / Poster */}
          {isBuffering && (
            <div className="absolute inset-0 z-0 bg-zinc-900">
              <img 
                src={video.thumbnail_url || video.video_url.replace('/playlist.m3u8', '/thumbnail.jpg')}
                alt="Thumbnail"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-zinc-900/40 animate-pulse flex items-center justify-center pointer-events-none" />
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-zinc-800 flex flex-col items-center justify-center text-zinc-500 space-y-3 z-10 relative pointer-events-auto">
          <p className="text-sm font-medium">Getting this video ready...</p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setHasError(false);
              setIsBuffering(true);
            }} 
            className="px-4 py-2 bg-white/10 text-white rounded-full font-medium text-sm hover:bg-white/20 transition-colors"
          >
            Try reloading
          </button>
        </div>
      )) : (
        <div className="absolute inset-0 z-0 bg-zinc-900">
          <img 
            src={video.thumbnail_url || video.video_url.replace('/playlist.m3u8', '/thumbnail.jpg')}
            alt="Thumbnail"
            className="w-full h-full object-cover opacity-50"
          />
        </div>
      )}

      {/* Play/Pause Overlay */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-black/40 p-4 rounded-full backdrop-blur-sm">
            <Play className="w-12 h-12 text-white/90 fill-white/90 ml-1" />
          </div>
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
            <Heart className="w-32 h-32 text-red-500 fill-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute toggle */}
      <button 
        onClick={toggleMute}
        className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white/90 hover:bg-black/40 transition-colors z-20 mt-4 cursor-pointer"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Bottom Gradient overlay - lighter gradient for readability without darkening */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none z-0" />

      {/* Content Overlay */}
      <div className="absolute bottom-[80px] left-3 right-16 flex flex-col justify-end pointer-events-none z-10 pb-safe">
        
        {/* Information Container */}
        <div className="flex flex-col mb-1.5 pointer-events-auto max-w-[90%]">
          
          {video.categories && (
            <div className="mb-1.5 flex">
              <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center">
                <Tag className="w-3 h-3 mr-1" />
                {video.categories.name}
              </span>
            </div>
          )}

          <div className="flex items-center flex-wrap gap-y-1">
            <span className="text-white font-sans font-bold text-[15px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              @{video.profiles?.username || 'user'}
            </span>
            {video.is_verified_real && (
              <BadgeCheck className="w-[15px] h-[15px] text-[#3897f0] ml-1 shrink-0 drop-shadow-sm" fill="currentColor" strokeWidth={0} />
            )}
            {/* Inline dynamic follow/you action badge next to username */}
            {(!user || video.user_id !== user?.id) ? (
              <button
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
            <div className="mt-2">
              <p 
                className="text-white/95 text-[14px] font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-[1.3] line-clamp-2 font-normal pr-2 whitespace-pre-wrap animate-fadeIn"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parsedProduct.captionText) }}
              />
            </div>
          )}

          {/* Product CTA (Reels style card) */}
          {video.product_url && (
            <div className="flex flex-col gap-2 mt-4 pointer-events-auto">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!user) {
                    triggerAuthGate("access verified product links & details");
                    return;
                  }
                  setDetailsActiveSection('main');
                  setShowProductDetails(true);
                }}
                className="group flex items-center bg-black/45 hover:bg-black/60 backdrop-blur-md rounded-xl p-1.5 pr-4 w-fit border border-white/10 transition-colors shadow-md text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center mr-3 border border-white/5">
                   <img src={video.main_product_image_url || video.thumbnail_url || "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=150&q=80"} alt="Product" className="w-full h-full object-cover animate-fadeIn" />
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
                    if (!user) {
                      triggerAuthGate("use discount coupons");
                      return;
                    }
                    setDetailsActiveSection('coupon');
                    setShowProductDetails(true);
                  }}
                  className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-555/20 backdrop-blur-md text-emerald-400 font-bold border border-emerald-500/25 px-2.5 py-1 rounded-lg w-fit text-[11px] uppercase tracking-wider shadow-sm transition-all animate-fadeIn"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
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
      <div className="absolute bottom-[80px] right-2 w-14 flex flex-col items-center space-y-5 z-20 pointer-events-auto pb-safe">
        
        {/* Avatar */}
        <div className="relative mb-2">
          <div className="w-[48px] h-[48px] rounded-full border-[1.5px] border-white/80 bg-[#1c1c1e] overflow-hidden shrink-0 shadow-sm flex flex-col justify-center items-center">
            {video.profiles?.avatar_url ? (
              <img src={video.profiles.avatar_url} alt={video.profiles.username} className="w-full h-full object-cover relative z-10" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-serif italic text-[16px] font-medium bg-zinc-800 relative z-10">
                {video.profiles?.username?.charAt(0).toLowerCase() || 'v'}
              </div>
            )}
          </div>
          {/* Follow toggle on avatar: only show if uploader !== viewer and is not following */}
          {(!user || video.user_id !== user.id) && !isFollowing && (
            <button
              onClick={handleFollowToggle}
              disabled={isFollowingLoading}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#ef2950] text-white flex items-center justify-center shadow-md border-[2px] border-black transition-transform active:scale-95 z-20"
            >
               <Plus className="w-4 h-4" strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Like Button */}
        <button 
          onClick={handleLikeToggle}
          className="flex flex-col items-center group active:scale-95 transition-transform"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill={isLiked ? "#ef2950" : "white"} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span className="text-white font-sans text-[13px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-1 tracking-tight text-center w-full">
            {likesCount >= 1000000 ? (likesCount / 1000000).toFixed(1) + 'M' : likesCount >= 1000 ? (likesCount / 1000).toFixed(1) + 'K' : likesCount}
          </span>
        </button>

        {/* Save/Bookmark Button */}
        <button 
          onClick={handleBookmarkToggle}
          className="flex flex-col items-center group active:scale-95 transition-transform mt-1"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill={isSaved ? "#facc15" : "white"} className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
          <span className="text-white font-sans text-[13px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-1 tracking-tight text-center w-full">
            {savesCount >= 1000000 ? (savesCount / 1000000).toFixed(1) + 'M' : savesCount >= 1000 ? (savesCount / 1000).toFixed(1) + 'K' : savesCount}
          </span>
        </button>

        {/* Share Button */}
        <button 
          onClick={handleShare}
          className="flex flex-col items-center group active:scale-95 transition-transform mt-1"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] ml-1">
             <path d="M21 12l-7-7v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19l7-7z"/>
          </svg>
          <span className="text-white font-sans text-[13px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-0 tracking-tight text-center w-full">Share</span>
        </button>

        {/* Report Button */}
        <button 
          onClick={handleReport}
          className="flex flex-col items-center group active:scale-95 transition-transform mt-3"
        >
          <Flag className="w-[30px] h-[30px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" fill="currentColor" />
        </button>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm pointer-events-auto"
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
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="absolute left-4 p-2 -ml-2 text-white/90 hover:text-white transition-colors"
                >
                   <ArrowLeft className="w-6 h-6" strokeWidth={2} />
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
                        className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center relative mb-6"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      >
                        <motion.div 
                          className="absolute inset-0 bg-green-500/20 rounded-full"
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <ShieldCheck className="w-10 h-10 text-green-500 relative z-10" />
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
                       <div className="flex flex-col space-y-3">
                          {REPORT_CATEGORIES.map((category) => (
                            <button
                              key={category.id}
                              onClick={() => setReportCategory(category as any)}
                              className={`w-full flex items-center p-4 bg-[#151518] rounded-xl transition-all group text-left border \${reportCategory?.id === category.id ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/5 hover:border-white/10'}`}
                            >
                              <div className={`w-[26px] h-[26px] rounded-full border-2 \${reportCategory?.id === category.id ? 'border-orange-500 text-orange-500' : 'border-[#ef2950]/80 text-[#ef2950]/80'} flex items-center justify-center shrink-0 mr-4 transition-colors`}>
                                  <div className="w-[10px] h-[10px] rounded-full border-2 border-current" />
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
                       <button
                         onClick={submitReport}
                         disabled={!reportCategory || isSubmittingReport}
                         className="w-full py-[18px] bg-[#ef2950] text-white font-semibold text-[16px] tracking-wide rounded-2xl flex items-center justify-center hover:bg-[#ef2950]/90 transition-colors active:scale-[0.98] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                          {isSubmittingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Report'}
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
                   className="absolute inset-0 w-full h-full object-cover"
                   alt="Product"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-transparent to-black/35 pointer-events-none" />
                 
                 {/* Top Navigation Overlay */}
                 <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] flex justify-between items-start z-10">
                   <button 
                     onClick={() => { setShowProductDetails(false); }}
                     className="w-10 h-10 flex items-center justify-center text-white bg-black/45 rounded-full backdrop-blur-md border border-white/5 hover:bg-black/60 active:scale-95 transition-all shadow-md"
                   >
                     <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
                   </button>
                   <button 
                     onClick={() => alert("Options coming soon")} 
                     className="w-10 h-10 flex items-center justify-center text-white bg-black/45 rounded-full backdrop-blur-md border border-white/5 hover:bg-black/60 active:scale-95 transition-all shadow-md"
                   >
                     <MoreHorizontal className="w-5 h-5" />
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
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>Creator Vouched</span>
                   </div>
                 </div>

                 {/* Authentic Product Link Badge */}
                 <div className="flex flex-col space-y-2 mt-4">
                   <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center shadow-sm w-fit">
                      <BadgeCheck className="w-4 h-4 text-emerald-400 mr-2" />
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Verified Authentic eComm Store Link</span>
                   </div>
                   {video.is_admin_verified_link && (
                     <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 flex flex-col shadow-sm w-fit">
                        <div className="flex items-center">
                          <ShieldCheck className="w-4 h-4 text-blue-400 mr-2" />
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
                   <h3 className="text-[15px] font-bold text-white mb-3 tracking-wide">Product Looks</h3>
                   <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none snap-x h-[140px]">
                     <div className="w-[110px] h-full rounded-2xl bg-zinc-900 overflow-hidden shrink-0 snap-start border border-white/5 shadow-sm relative group">
                        <img src={video.main_product_image_url || video.thumbnail_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop"} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 rounded text-[9px] text-white">Official</span>
                     </div>
                     {video.real_life_image_url && (
                       <div className="w-[110px] h-full rounded-2xl bg-zinc-900 overflow-hidden shrink-0 snap-start border border-white/5 shadow-sm relative group">
                          <img src={video.real_life_image_url} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-[#ef2950] rounded text-[9px] text-white font-bold uppercase">Real Pic</span>
                       </div>
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
                       <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                       </svg>
                       <span>Exclusive Discount Match</span>
                     </div>
                     
                     <div className="flex gap-3 bg-zinc-950/80 border border-white/5 p-3 rounded-xl items-center justify-between mb-4">
                       <div className="flex flex-col">
                         <span className="text-[12px] text-zinc-500 uppercase tracking-widest font-mono">Promo Coupon Code</span>
                         <span className="text-[18px] font-extrabold text-[#11b981] font-mono tracking-wider">{parsedProduct.couponCode}</span>
                       </div>
                       
                       <button
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
                   <div className="mt-8 border-t border-zinc-900 pt-6 space-y-6">
                     <h3 className="text-[16px] font-bold text-white mb-2 tracking-wide font-sans">Product Breakdown</h3>
                     
                     {/* Product Uses Block */}
                     {parsedProduct.productUses.length > 0 && (
                       <div className="space-y-2.5">
                         <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block font-sans">Tested Use Cases</span>
                         <div className="text-[14px] text-zinc-300 leading-relaxed space-y-2 pl-0.5">
                           {parsedProduct.productUses.map((line, idx) => (
                             <div key={idx} className="flex items-start gap-2.5">
                               <div className="w-[18px] h-[18px] rounded-full bg-[#ef2950]/10 border border-[#ef2950]/20 flex items-center justify-center shrink-0 mt-0.5">
                                 <svg className="w-2.5 h-2.5 text-[#ef2950]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
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
                       <div className="space-y-2.5 pt-4 border-t border-zinc-900">
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
                       <div className="space-y-2.5 pt-4 border-t border-zinc-900">
                         <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block font-sans">Primary Benefits</span>
                         <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/10 text-[14px] text-zinc-300 leading-relaxed space-y-2">
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
                           <AlertOctagon className="w-3.5 h-3.5" />
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
               <a
                 href={video.product_url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="w-full bg-[#ef2950] hover:bg-[#ff3b61] active:scale-[0.98] text-white font-bold py-4.5 px-6 rounded-2xl transition-all flex items-center justify-center text-[16px] shadow-[0_4px_15px_rgba(239,41,80,0.45)] tracking-wide shrink-0"
               >
                 Buy From Verified eCommerce Store
               </a>
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
      <AnimatePresence>
        {showVerifiedInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm pointer-events-auto"
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
                  <BadgeCheck className="w-6 h-6 mr-2" strokeWidth={2.5} />
                  <h3 className="text-xl font-bold text-white tracking-tight">Verified Hands-On</h3>
                </div>
                <button 
                  onClick={() => setShowVerifiedInfo(false)}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors bg-zinc-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-zinc-300 leading-relaxed mb-6">
                This creator uploaded a real-life photo to prove they actually use this product. You can view their photo in the product details.
              </p>
              <button
                onClick={() => setShowVerifiedInfo(false)}
                className="w-full bg-[#4A63F3] hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg active:scale-[0.98]"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
});
