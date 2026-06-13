import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Profile, Video } from '../types';
import { parseVideoProduct } from '../utils/videoUtils';
import { Loader2, Settings, Play, Edit3, X, ImagePlus, Instagram, Link2, Trash2, Moon, SunMoon, Lock, Bell, Shield, Palette, HelpCircle, ChevronRight, Bookmark, TrendingUp, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { GuestGate } from '../components/GuestGate';
import { ProfileImageCropper } from '../components/ProfileImageCropper';
import { SEO } from '../components/SEO';
import CreatorAnalytics from '../components/CreatorAnalytics';

import { GlobalBackButton } from '../components/GlobalBackButton';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagementDetails, setEngagementDetails] = useState({
    likesByVideo: {} as Record<string, number>,
    commentsByVideo: {} as Record<string, number>,
    savesByVideo: {} as Record<string, number>
  });

  // Edit Profile State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editTiktok, setEditTiktok] = useState('');
  const [avatarObj, setAvatarObj] = useState<{ file: File; preview: string } | null>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Follow Counts
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Removed global event listener effect for activeMenuId

  useEffect(() => {
    if (user) {
      fetchProfileAndVideos();
    }
  }, [user]);

  const fetchProfileAndVideos = async () => {
    setLoading(true);
    try {
      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
        
      if (profileData) {
        setProfile(profileData);
        setEditBio(profileData.bio || '');
        setEditInstagram(profileData.instagram || '');
        setEditTiktok(profileData.tiktok || '');
      }

      // Fetch User's Videos
      const { data: videosData } = await supabase
        .from('videos')
        .select('*, categories (id, name)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (videosData) {
        setVideos(videosData);
        
        const videoIds = videosData.map(v => v.id);
        const likesByVideo: Record<string, number> = {};
        const commentsByVideo: Record<string, number> = {};
        const savesByVideo: Record<string, number> = {};

        try {
          const { data: statsData, error: statsError } = await supabase
            .from('creator_video_stats')
            .select('*')
            .eq('user_id', user?.id);

          if (!statsError && statsData && statsData.length > 0) {
            statsData.forEach((stat: any) => {
              likesByVideo[stat.video_id] = stat.likes_count || 0;
              commentsByVideo[stat.video_id] = stat.comments_count || 0;
              savesByVideo[stat.video_id] = stat.saves_count || 0;
            });
          } else {
            throw new Error('Fallback to metadata counts');
          }
        } catch (fbErr) {
          const countsPromises = videoIds.map(async (id) => {
            try {
              const [lCount, cCount, sCount] = await Promise.all([
                supabase.from('likes').select('*', { count: 'exact', head: true }).eq('video_id', id),
                supabase.from('comments').select('*', { count: 'exact', head: true }).eq('video_id', id),
                supabase.from('saved_videos').select('*', { count: 'exact', head: true }).eq('video_id', id)
              ]);
              likesByVideo[id] = lCount.count || 0;
              commentsByVideo[id] = cCount.count || 0;
              savesByVideo[id] = sCount.count || 0;
            } catch (err) {}
          });
          await Promise.all(countsPromises);
        }
        
        setEngagementDetails({ likesByVideo, commentsByVideo, savesByVideo });
      }

      // Fetch Followers and Following counts
      const { count: fCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user?.id);
      const { count: followingC } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user?.id);
      
      setFollowersCount(fCount || 0);
      setFollowingCount(followingC || 0);

    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    navigate('/', { replace: true });
    // Let navigation finish, then complete signOut
    setTimeout(async () => {
      await signOut();
    }, 50);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validation
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setEditError("Invalid file format. Only JPG, PNG, and WebP are allowed.");
        setCropperSrc(null);
        return;
      }
      
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSizeInBytes) {
        setEditError("Image is too large. Maximum size is 5MB.");
        setCropperSrc(null);
        return;
      }
      
      setEditError(null);
      setPendingFileName(file.name);
      setCropperSrc(URL.createObjectURL(file));
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setEditError(null);
    try {
      let finalAvatarUrl = profile?.avatar_url;

      if (avatarObj) {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(avatarObj.file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });

        const sessionData = await supabase.auth.getSession();
        const token = sessionData.data.session?.access_token;
        
        const res = await fetch('/api/bunny/upload-image', {
          method: 'POST',
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            imageBase64: base64,
            filename: avatarObj.file.name
          })
        });

        if (!res.ok) {
           const errText = await res.text();
           throw new Error(`Failed to upload avatar: ${errText}`);
        }

        const data = await res.json();
        if (data.url) {
          finalAvatarUrl = `${data.url}?v=${Date.now()}`;
        }
      }

      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
        
      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bio: DOMPurify.sanitize(editBio),
          instagram: DOMPurify.sanitize(editInstagram),
          tiktok: DOMPurify.sanitize(editTiktok),
          avatar_url: finalAvatarUrl
        })
      });
      
      if (!res.ok) {
         const err = await res.json();
         throw new Error(err.error || 'Failed to update profile');
      }
      setProfile(prev => prev ? { 
        ...prev, 
        bio: editBio, 
        instagram: editInstagram, 
        tiktok: editTiktok,
        avatar_url: finalAvatarUrl || prev.avatar_url
      } : null);
      setIsEditModalOpen(false);
      setAvatarObj(null);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      try {
        // Try parsing assuming the error text might contain a JSON wrapped inside
        if (err?.message && err.message.includes('{"error"')) {
          const m = err.message.match(/({.*})/);
          if (m && m[1]) {
            const parsed = JSON.parse(m[1]);
            setEditError(parsed.error || err.message);
            return;
          }
        }
      } catch (e) {}
      setEditError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Edit Video State
  const [videoToEdit, setVideoToEdit] = useState<any>(null);
  const [editVideoCaptionText, setEditVideoCaptionText] = useState('');
  const [editVideoTags, setEditVideoTags] = useState('');
  const [editVideoProductName, setEditVideoProductName] = useState('');
  const [editVideoProductPrice, setEditVideoProductPrice] = useState('');
  const [editVideoProductUrl, setEditVideoProductUrl] = useState('');
  const [editVideoCategoryId, setEditVideoCategoryId] = useState('');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [editVideoError, setEditVideoError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleEditVideoClick = (e: React.MouseEvent, video: any) => {
    e.stopPropagation();
    setVideoToEdit(video);
    setEditVideoError(null);
    let parsedCaption: any = {};
    try {
      if (video.caption) {
        parsedCaption = typeof video.caption === 'string' ? JSON.parse(video.caption) : video.caption;
      }
    } catch(e) {}
    setEditVideoCaptionText(parsedCaption.captionText || '');
    setEditVideoTags(Array.isArray(video.tags) ? video.tags.join(', ') : '');
    setEditVideoProductName(parsedCaption.product_name || '');
    setEditVideoProductPrice(parsedCaption.product_price ? parsedCaption.product_price.toString() : '');
    setEditVideoProductUrl(video.product_url || '');
    setEditVideoCategoryId(video.category_id || '');
    setActiveMenuId(null);
  };

  const handleSaveVideoEdit = async () => {
    if (!videoToEdit) return;
    setIsEditingVideo(true);
    setEditVideoError(null);
    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      
      let newCaptionObj: any = {};
      try {
        if (videoToEdit.caption) {
          newCaptionObj = typeof videoToEdit.caption === 'string' ? JSON.parse(videoToEdit.caption) : videoToEdit.caption;
        }
      } catch(e) {}
      newCaptionObj.captionText = editVideoCaptionText.trim();
      if (editVideoProductName.trim()) newCaptionObj.product_name = editVideoProductName.trim();
      if (editVideoProductPrice.trim() && !isNaN(Number(editVideoProductPrice))) newCaptionObj.product_price = Number(editVideoProductPrice);
      
      const newTagsArray = editVideoTags.split(',').flatMap(t => { const trimmed = t.trim(); return trimmed ? [trimmed] : []; });

      const res = await fetch(`/api/videos/${videoToEdit.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          caption: JSON.stringify(newCaptionObj),
          tags: newTagsArray,
          product_url: editVideoProductUrl || null,
          category_id: editVideoCategoryId || null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update video');
      }

      const { data } = await res.json();
      setVideos(prev => prev.map(v => v.id === videoToEdit.id ? { ...v, caption: data.caption, tags: data.tags } : v));
      setVideoToEdit(null);
    } catch(err: any) {
      setEditVideoError(err.message);
    } finally {
      setIsEditingVideo(false);
    }
  };

  const handleDeleteVideoClick = (e: React.MouseEvent, videoId: string) => {
    setActiveMenuId(null);
    e.stopPropagation();
    setVideoToDelete(videoId);
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    setIsDeleting(true);
    try {
      const videoObj = videos.find(v => v.id === videoToDelete);
      
      const { error } = await supabase.from('videos').delete().eq('id', videoToDelete);
      if (error) throw error;
      
      // Attempt to delete from Bunny Stream as well if we have a URL
      if (videoObj && videoObj.video_url) {
        const match = videoObj.video_url.match(/https?:\/\/[^\/]+\/([a-f0-9\-]+)\//i);
        if (match && match[1]) {
          try {
            const sessionData = await supabase.auth.getSession();
            const token = sessionData.data.session?.access_token;
            await fetch(`/api/bunny/delete/${match[1]}`, { 
              method: 'DELETE', 
              headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            });
            console.log("Deleted video from Bunny Stream:", match[1]);
          } catch (bunnyErr) {
            console.error("Failed to delete video from Bunny Stream:", bunnyErr);
          }
        }
      }

      setVideos(prev => prev.filter(v => v.id !== videoToDelete));
      setVideoToDelete(null);
    } catch (err: any) {
      console.error("Error deleting video:", err);
      alert(`Failed to delete video: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-64px-env(safe-area-inset-bottom))] w-full bg-[#0c0c0e] text-white font-sans">
        {/* Header Skeleton */}
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#0c0c0e]/80 backdrop-blur-xl border-b border-white/5">
          <div className="w-32 h-6 bg-zinc-900 rounded-md animate-pulse"></div>
          <div className="size-8 bg-zinc-900 rounded-full animate-pulse"></div>
        </header>

        {/* Profile Info Skeleton */}
        <div className="px-4 py-8 flex flex-col items-center border-b border-white/5">
          <div className="size-24 rounded-full bg-zinc-900 animate-pulse border border-white/5 mb-5" />
          <div className="w-40 h-6 bg-zinc-900 rounded-md animate-pulse mb-4"></div>
          <div className="w-64 h-4 bg-zinc-900 rounded-md animate-pulse mb-8"></div>
          
          <div className="flex gap-x-12 text-center text-sm mb-8 w-full justify-center">
            <div className="gap-y-2"><div className="w-8 h-6 bg-zinc-900 rounded mx-auto animate-pulse"></div><div className="w-12 h-4 bg-zinc-900 rounded animate-pulse"></div></div>
            <div className="gap-y-2"><div className="w-8 h-6 bg-zinc-900 rounded mx-auto animate-pulse"></div><div className="w-12 h-4 bg-zinc-900 rounded animate-pulse"></div></div>
            <div className="gap-y-2"><div className="w-8 h-6 bg-zinc-900 rounded mx-auto animate-pulse"></div><div className="w-12 h-4 bg-zinc-900 rounded animate-pulse"></div></div>
          </div>
        </div>

        {/* Video Grid Skeleton */}
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[9/16] bg-zinc-900 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return <GuestGate type="profile" />;
  }

  const profileSchema = profile ? {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.username || 'Aisles Creator',
    description: profile.bio || 'Check out my profile on Aisles.',
    image: profile.avatar_url || 'https://aisles.app/og-image.jpg',
    url: `https://aisles.app/creator/${profile.username || profile.id}`,
    sameAs: [
      profile.instagram ? `https://instagram.com/${profile.instagram}` : null,
      profile.tiktok ? `https://tiktok.com/@${profile.tiktok}` : null
    ].filter(Boolean)
  } : undefined;

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white font-sans selection:bg-white/20 h-full flex flex-col">
      {profile && (
        <SEO 
          title={`${profile.username || 'Creator'} | Aisles Profile`}
          description={profile.bio || `Watch amazing videos from ${profile.username || 'this creator'} on Aisles.`}
          image={profile.avatar_url}
          type="profile"
          url={`https://aisles.app/creator/${profile.username || profile.id}`}
          structuredData={profileSchema}
        />
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 pt-6 bg-[#0c0c0e]">
        <GlobalBackButton className="p-2 bg-transparent hover:bg-white/5 border-transparent -ml-3" />
        <div className="flex items-center gap-x-2.5 -mr-3">
          <button type="button" aria-label="button"  
            onClick={() => navigate('/saved')} 
            className="p-2.5 text-white/90 hover:text-white hover:bg-white/5 active:scale-95 rounded-full transition-all"
            title="Saved items"
          >
             <Bookmark className="size-5.5" strokeWidth={2.2} />
          </button>
          <button type="button" aria-label="button"  
            onClick={() => setIsSettingsModalOpen(true)} 
            className="p-2.5 text-white/90 hover:text-white hover:bg-white/5 active:scale-95 rounded-full transition-all"
          >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
      </header>

      {/* Profile Info */}
      <div className="px-5 pt-3 pb-8 flex flex-col items-start relative border-b border-white/5">
         {/* Top Row: Avatar & Name */}
         <div className="flex items-center w-full mb-6 relative">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
               className="size-[84px] rounded-full overflow-hidden shrink-0 border-[1.5px] border-white/20"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="size-full object-cover" />
              ) : (
                <div className="size-full bg-zinc-800 flex items-center justify-center text-white/40 font-serif italic text-2xl font-bold">
                  {profile?.username?.charAt(0)?.toLowerCase() || 'u'}
                </div>
              )}
            </motion.div>
            
            <div className="flex flex-col ml-5 justify-center flex-1">
               <motion.h2 
                 initial={{ y: 5, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ duration: 0.3, delay: 0.1 }}
                 className="text-[20px] font-sans font-bold tracking-tight mb-0.5 text-white flex items-center"
               >
                 {profile?.username || 'Glow With Sia'}
                 <svg className="size-[18px] ml-1.5 text-[#3897f0]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
               </motion.h2>
               <motion.p className="text-white/70 text-[14px] font-medium tracking-wide">
                 @{profile?.username?.toLowerCase() || 'glow.with.sia'}
               </motion.p>
            </div>
         </div>

        {/* Stats */}
        <div className="flex justify-between w-[90%] max-w-[300px] mb-6 pt-2">
          <div className="flex flex-col items-center">
             <div className="font-bold text-[18px] text-white">{videos.length}</div>
             <span className="text-[13px] font-medium text-white/60">Posts</span>
          </div>
          <div className="flex flex-col items-center">
             <div className="font-bold text-[18px] text-white">
               {followersCount > 999 ? (followersCount / 1000).toFixed(1) + 'K' : followersCount}
             </div>
             <span className="text-[13px] font-medium text-white/60">Followers</span>
          </div>
          <div className="flex flex-col items-center">
             <div className="font-bold text-[18px] text-white">
               {followingCount > 999 ? (followingCount / 1000).toFixed(1) + 'K' : followingCount}
             </div>
             <span className="text-[13px] font-medium text-white/60">Following</span>
          </div>
        </div>

        {/* Bio */}
        <motion.div 
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="text-[#e0e0e0] text-[15px] max-w-sm mb-5 font-normal leading-[1.6] tracking-wide w-full"
        >
          {profile?.bio ? (
            profile.bio.split('\n').map((line, idx) => (
              <p key={idx}>{line}</p>
            ))
          ) : (
            <>
              <p>Skincare | Beauty | Lifestyle ✨</p>
              <p>Honest reviews & real results</p>
              <p>Let's glow together ❤️</p>
            </>
          )}
        </motion.div>

        {/* Social Icons */}
        <div className="flex items-center gap-x-3 mb-6 w-full">
           <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-white ml-2"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
           <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-white ml-2"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full gap-x-3 mb-4">
           <button type="button" aria-label="button"  
             onClick={() => setIsEditModalOpen(true)}
             className="flex-1 bg-[#ef2950] hover:bg-[#ff3b61] active:scale-[0.98] text-white font-bold py-3.5 rounded-[12px] transition-all text-[15px] shadow-[0_4px_14px_rgba(239,41,80,0.3)] tracking-wide"
           >
             Edit Profile
           </button>
           <button type="button" aria-label="button"  
             onClick={() => {
               navigator.clipboard.writeText(window.location.href);
               alert('Profile URL copied to clipboard!');
             }}
             className="flex-1 bg-[#2c2c2e] hover:bg-white/10 active:scale-[0.98] text-white font-semibold py-3.5 rounded-[12px] transition-all text-[15px] border border-white/5 tracking-wide"
           >
             Share Profile
           </button>
        </div>

        {/* Dashboard Actions */}
        <div className="flex w-full gap-x-3 mb-4">
          <button type="button" aria-label="button"  
            onClick={() => navigate('/creator-dashboard')}
            className="flex-1 bg-[#1c1c1e] hover:bg-white/10 active:scale-[0.98] text-white font-medium py-3 rounded-[12px] transition-all border border-white/5 flex flex-col items-center justify-center gap-y-1 tracking-wide group"
          >
            <TrendingUp className="size-[18px] text-[#ef2950] group-hover:scale-110 transition-transform" />
            <span className="text-[12px] text-zinc-300">Creator Dashboard</span>
          </button>
          
          {profile?.is_admin && (
             <button type="button" aria-label="button"  
              onClick={() => navigate('/admin')}
              className="flex-1 bg-[#1c1c1e] hover:bg-white/10 active:scale-[0.98] text-white font-medium py-3 rounded-[12px] transition-all border border-white/5 flex flex-col items-center justify-center gap-y-1 tracking-wide group"
            >
              <Shield className="size-[18px] text-[#ef2950] group-hover:scale-110 transition-transform" />
              <span className="text-[12px] text-zinc-300">Admin Panel</span>
            </button>
          )}
        </div>
        
        {/* Creator Analytics Summary */}
        <div className="w-full">
           <CreatorAnalytics videos={videos} engagementDetails={engagementDetails} />
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 w-full p-2">
        <div className="grid grid-cols-3 gap-2 bg-[#0c0c0e]">
          {videos.length === 0 ? (
             <div className="col-span-3 py-10 flex flex-col items-center justify-center text-zinc-500">
               <p className="text-sm font-medium">No posts yet.</p>
             </div>
          ) : (
             videos.map((video) => {
               const parsedProduct = parseVideoProduct(video.caption);
               return (
                 <div key={video.id} className="aspect-[3/4] bg-zinc-900 overflow-hidden relative rounded-xl border border-white/5 group cursor-pointer" onClick={() => navigate(`/video/${video.id}`)}>
                   {video.thumbnail_url || video.main_product_image_url ? (
                     <img src={video.thumbnail_url || video.main_product_image_url} alt="Video thumbnail" className="size-full object-cover" />
                   ) : (
                     <div className="size-full flex items-center justify-center bg-zinc-800 text-zinc-600">No Image</div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />
                   
                   {parsedProduct.productPrice && video.status === 'active' && (
                     <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#0c0c0e]/60 backdrop-blur-sm text-[10.5px] font-bold text-white rounded shadow-sm border border-white/5">
                       ₹{parsedProduct.productPrice.toLocaleString('en-IN')}
                     </div>
                   )}
                   
                   {video.status && video.status !== 'active' && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
                        <div className="text-center">
                           <Shield className="size-6 text-white/50 mx-auto mb-2" />
                           <span className="text-[11px] font-bold text-white/90 uppercase tracking-widest text-center">
                             {video.status === 'processing' 
                               ? 'Processing...' 
                               : video.status === 'pending_review' 
                                 ? 'Under Review' 
                                 : 'Restricted'}
                           </span>
                        </div>
                     </div>
                   )}

                   <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                     <div className="flex items-center shadow-sm text-white font-bold">
                       <Play className="size-3.5 fill-white text-white opacity-90 mr-1" />
                       <span className="text-white text-[12.5px] font-bold tracking-wide">{video.views > 999 ? (video.views/1000).toFixed(1) + 'K' : video.views}</span>
                     </div>
                     {parsedProduct.productName && (
                       <span className="text-white/80 text-[10px] truncate max-w-[60%] font-medium text-right pl-2">
                         {parsedProduct.productName}
                       </span>
                     )}
                   </div>
                                   <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-opacity">
                    <div className="relative">
                      <button type="button" aria-label="More options"
                        onClick={(e) => {
                           e.stopPropagation();
                           setActiveMenuId(activeMenuId === video.id ? null : video.id);
                        }}
                        className="p-1.5 bg-[#0c0c0e]/60 text-white rounded-full hover:bg-[#0c0c0e]/90 backdrop-blur-sm"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                      
                      {activeMenuId === video.id && (
                         <>
                           <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                           <div className="absolute top-full right-0 mt-1 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-20 flex flex-col">
                             <button type="button" 
                               onClick={(e) => handleEditVideoClick(e, video)}
                             className="text-left px-3 py-2 text-sm text-white hover:bg-white/5 flex items-center"
                           >
                             <Edit3 className="size-3.5 mr-2" /> Edit
                           </button>
                           <button type="button" 
                             onClick={(e) => handleDeleteVideoClick(e, video.id)}
                             className="text-left px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 flex items-center"
                           >
                             <Trash2 className="size-3.5 mr-2" /> Delete
                           </button>
                         </div>
                         </>
                      )}
                    </div>
                  </div>
                 {video.status === 'pending_review' && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-yellow-500/80 text-white text-[10px] font-bold rounded">
                       Review
                    </div>
                 )}
               </div>
             );
           })
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0c0c0e]/80 backdrop-blur-xl"
            onClick={() => !isSaving && setIsEditModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative"
            >
              <button type="button" aria-label="button"  
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-1.5"
                disabled={isSaving}
              >
                <X className="size-4" />
              </button>

              <h2 className="text-xl font-display font-semibold text-white mb-8">Update Profile</h2>

              <form onSubmit={saveProfile} className="gap-y-5">
                <div className="flex flex-col items-center mb-8">
                  <div 
                    className="relative size-28 rounded-full border border-white/10 bg-zinc-900 flex items-center justify-center cursor-pointer group overflow-hidden shadow-xl"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarObj?.preview ? (
                      <img src={avatarObj.preview} alt="Avatar" className="size-full object-cover" />
                    ) : profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="size-full object-cover" />
                    ) : (
                      <ImagePlus className="size-8 text-zinc-600 group-hover:text-white transition-colors" strokeWidth={1.5} />
                    )}
                    <div className="absolute inset-0 bg-[#0c0c0e]/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImagePlus className="size-6 text-white" />
                    </div>
                  </div>
                  
                  {/* Photo Standard Dimensions & Crop Notice */}
                  <div className="mt-4 text-center max-w-[280px]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#ef2950] block mb-1">
                      Instagram Recommended
                    </span>
                    <p className="text-[11px] text-zinc-400 font-medium leading-normal">
                      Profile photos are best at 1:1 aspect ratio (320 × 320 px). If not set, we'll open a crop preview to align your photo perfectly.
                    </p>
                  </div>

                  <input 
                    type="file" 
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden" 
                  />
                </div>

                <div>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Add a bio..."
                    maxLength={150}
                    className="w-full bg-zinc-900 text-white rounded-xl py-3 px-4 min-h-[100px] border border-white/5 focus:outline-none focus:border-white/30 resize-none text-sm placeholder:text-zinc-600 transition-colors"
                  />
                  <div className="text-right text-[11px] text-zinc-600 mt-1 font-medium tracking-wide">
                    {editBio.length} / 150
                  </div>
                </div>

                <div>
                  <div className="flex items-center bg-zinc-900 rounded-xl border border-white/5 focus-within:border-white/30 px-4 transition-colors">
                    <Instagram className="size-4 text-zinc-500 mr-3" strokeWidth={1.5} />
                    <input
                      type="text"
                      value={editInstagram}
                      onChange={(e) => setEditInstagram(e.target.value)}
                      placeholder="Instagram username"
                      className="w-full bg-transparent text-white py-3.5 focus:outline-none text-sm placeholder:text-zinc-600 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center bg-zinc-900 rounded-xl border border-white/5 focus-within:border-white/30 px-4 transition-colors">
                    <Link2 className="size-4 text-zinc-500 mr-3" strokeWidth={1.5} />
                    <input
                      type="text"
                      value={editTiktok}
                      onChange={(e) => setEditTiktok(e.target.value)}
                      placeholder="TikTok username"
                      className="w-full bg-transparent text-white py-3.5 focus:outline-none text-sm placeholder:text-zinc-600 font-sans"
                    />
                  </div>
                </div>

                {editError && (
                  <div className="p-3 bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-medium rounded-xl flex items-center">
                    <div className="size-1.5 rounded-full bg-red-400 mr-2 shrink-0" />
                    {editError}
                  </div>
                )}

                <div className="pt-2">
                  <button aria-label="button" 
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-white text-black font-semibold font-sans py-3.5 flex items-center justify-center rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  >
                    {isSaving ? <Loader2 className="size-5 animate-spin" /> : "Save Profile"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col justify-end p-2 sm:p-4 bg-[#0c0c0e]/80 backdrop-blur-sm"
            onClick={() => setIsSettingsModalOpen(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0c0c0e] border border-white/10 rounded-3xl h-[85vh] sm:h-auto sm:max-h-[85vh] w-full max-w-sm mx-auto shadow-2xl relative overflow-hidden flex flex-col"
            >
              <div className="flex-1 overflow-y-auto no-scrollbar p-5 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col">
                <div className="flex items-center justify-center mb-6 pt-1 relative">
                  <h2 className="text-[17px] font-sans font-medium tracking-wide text-white">Settings</h2>
                </div>
                
                <div className="gap-y-3 mb-auto">
                  <button type="button" aria-label="button"  onClick={() => alert('Account module coming soon')} className="w-full p-4 bg-[#151518] hover:bg-white/5 transition-colors rounded-[20px] flex items-center group text-left border border-white/5">
                    <div className="size-[42px] rounded-full overflow-hidden bg-zinc-800 shrink-0 mr-4 border border-white/10">
                      {profile?.avatar_url ? (
                         <img src={profile.avatar_url} alt="Profile" className="size-full object-cover" />
                      ) : (
                         <div className="size-full bg-zinc-800 flex items-center justify-center text-white/40 font-serif italic text-lg font-bold">
                           {profile?.username?.charAt(0)?.toLowerCase() || 'u'}
                         </div>
                      )}
                    </div>
                    <div className="flex-1 mr-2">
                       <h4 className="text-[15px] font-medium text-white tracking-wide mb-0.5">Account</h4>
                       <p className="text-[13px] text-zinc-400 tracking-wide">Edit profile, username, email</p>
                    </div>
                    <ChevronRight className="size-[18px] text-zinc-600 group-hover:text-white/70 transition-colors" />
                  </button>

                  <button type="button" aria-label="button"  
                    onClick={() => {
                      setIsSettingsModalOpen(false);
                      navigate('/saved');
                    }} 
                    className="w-full p-4 bg-[#151518] hover:bg-white/5 transition-colors rounded-[20px] flex items-center group text-left border border-white/5"
                  >
                    <div className="size-[42px] rounded-full bg-[#1c1c1e] shrink-0 mr-4 flex items-center justify-center border border-white/5 group-hover:bg-zinc-800 transition-colors">
                      <Bookmark className="size-5 text-[#ef2950]" strokeWidth={2.0} />
                    </div>
                    <div className="flex-1 mr-2">
                       <h4 className="text-[15px] font-medium text-white tracking-wide mb-0.5">Saved Items</h4>
                       <p className="text-[13px] text-zinc-400 tracking-wide">My bookmarked videos, products & collections</p>
                    </div>
                    <ChevronRight className="size-[18px] text-zinc-600 group-hover:text-white/70 transition-colors" />
                  </button>

                  <button type="button" aria-label="button"  onClick={() => alert('Privacy module coming soon')} className="w-full p-4 bg-[#151518] hover:bg-white/5 transition-colors rounded-[20px] flex items-center group text-left border border-white/5">
                    <div className="size-[42px] rounded-full bg-[#1c1c1e] shrink-0 mr-4 flex items-center justify-center border border-white/5 group-hover:bg-zinc-800 transition-colors">
                      <Lock className="size-5 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 mr-2">
                       <h4 className="text-[15px] font-medium text-white tracking-wide mb-0.5">Privacy</h4>
                       <p className="text-[13px] text-zinc-400 tracking-wide">Security, hidden accounts</p>
                    </div>
                    <ChevronRight className="size-[18px] text-zinc-600 group-hover:text-white/70 transition-colors" />
                  </button>

                  <button type="button" aria-label="button"  onClick={() => alert('Notifications module coming soon')} className="w-full p-4 bg-[#151518] hover:bg-white/5 transition-colors rounded-[20px] flex items-center group text-left border border-white/5">
                    <div className="size-[42px] rounded-full bg-[#1c1c1e] shrink-0 mr-4 flex items-center justify-center border border-white/5 group-hover:bg-zinc-800 transition-colors">
                      <Bell className="size-5 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 mr-2">
                       <h4 className="text-[15px] font-medium text-white tracking-wide mb-0.5">Notifications</h4>
                       <p className="text-[13px] text-zinc-400 tracking-wide">Push, email preferences</p>
                    </div>
                    <ChevronRight className="size-[18px] text-zinc-600 group-hover:text-white/70 transition-colors" />
                  </button>

                  <button type="button" aria-label="button"  onClick={() => {
                        setIsSettingsModalOpen(false);
                        navigate('/creator-verification');
                    }} className="w-full p-4 bg-[#151518] hover:bg-white/5 transition-colors rounded-[20px] flex items-center group text-left border border-white/5">
                    <div className="size-[42px] rounded-full bg-[#1c1c1e] shrink-0 mr-4 flex items-center justify-center border border-white/5 group-hover:bg-zinc-800 transition-colors">
                      <Shield className="size-5 text-zinc-500" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 mr-2">
                       <h4 className="text-[15px] font-medium text-white tracking-wide mb-0.5">Creator Verification</h4>
                       <p className="text-[13px] text-zinc-400 tracking-wide">Apply for verification badge</p>
                    </div>
                    <ChevronRight className="size-[18px] text-zinc-600 group-hover:text-white/70 transition-colors" />
                  </button>

                  <button type="button" aria-label="button"  onClick={toggleTheme} className="w-full p-4 bg-[#151518] hover:bg-white/5 transition-colors rounded-[20px] flex items-center group text-left border border-white/5">
                    <div className="size-[42px] rounded-full bg-[#1c1c1e] shrink-0 mr-4 flex items-center justify-center border border-white/5 group-hover:bg-zinc-800 transition-colors">
                      <Palette className="size-5 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 mr-2">
                       <h4 className="text-[15px] font-medium text-white tracking-wide mb-0.5">Theme</h4>
                       <p className="text-[13px] text-zinc-400 tracking-wide">Dark</p>
                    </div>
                    <ChevronRight className="size-[18px] text-zinc-600 group-hover:text-white/70 transition-colors" />
                  </button>

                  <button type="button" aria-label="button"  onClick={() => alert('Help & Support module coming soon')} className="w-full p-4 bg-[#151518] hover:bg-white/5 transition-colors rounded-[20px] flex items-center group text-left border border-white/5">
                    <div className="size-[42px] rounded-full bg-[#1c1c1e] shrink-0 mr-4 flex items-center justify-center border border-white/5 group-hover:bg-zinc-800 transition-colors">
                      <HelpCircle className="size-5 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 mr-2">
                       <h4 className="text-[15px] font-medium text-white tracking-wide mb-0.5">Help & Support</h4>
                       <p className="text-[13px] text-zinc-400 tracking-wide">FAQs, reporting, contact us</p>
                    </div>
                    <ChevronRight className="size-[18px] text-zinc-600 group-hover:text-white/70 transition-colors" />
                  </button>
                </div>
                
                <button type="button" aria-label="button" 
                  onClick={handleSignOut}
                  className="w-full mt-6 py-4 bg-transparent border border-red-500/30 text-red-500 font-medium tracking-wide rounded-[20px] flex items-center justify-center hover:bg-red-500/5 transition-all active:scale-[0.98]"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {videoToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0c0c0e]/80 backdrop-blur-md"
            onClick={() => !isDeleting && setVideoToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-white/10 p-6 rounded-3xl w-full max-w-[320px] shadow-2xl text-center"
            >
              <h2 className="text-xl font-display font-semibold text-white mb-3">Delete Post?</h2>
              <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
                Are you sure? This can't be undone.
              </p>
              
              <div className="flex gap-x-3">
                <button type="button" aria-label="button" 
                  onClick={() => setVideoToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white font-semibold font-sans text-sm rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button type="button" aria-label="button" 
                  onClick={confirmDeleteVideo}
                  disabled={isDeleting}
                  className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold font-sans text-sm rounded-xl transition-all flex items-center justify-center disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-red-500/20"
                >
                  {isDeleting ? <Loader2 className="size-5 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Video Modal */}
      <AnimatePresence>
        {videoToEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0c0c0e]/80 backdrop-blur-md"
            onClick={() => !isEditingVideo && setVideoToEdit(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-white/10 p-6 rounded-3xl w-full max-w-[400px] shadow-2xl relative"
            >
              <button type="button" aria-label="Close"  
                onClick={() => setVideoToEdit(null)}
                className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-1.5"
                disabled={isEditingVideo}
              >
                <X className="size-4" />
              </button>
              
              <h2 className="text-xl font-display font-semibold text-white mb-6">Edit Video</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Caption/Text</label>
                  <textarea 
                    value={editVideoCaptionText}
                    onChange={(e) => setEditVideoCaptionText(e.target.value)}
                    placeholder="Enter new caption..."
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors h-24 resize-none"
                  />
                  <div className="text-right text-xs text-zinc-500 mt-1">
                    {editVideoCaptionText.length} characters
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Product Name</label>
                  <input 
                    type="text"
                    value={editVideoProductName}
                    onChange={(e) => setEditVideoProductName(e.target.value)}
                    placeholder="Enter product name..."
                     className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Product Price</label>
                  <input 
                    type="number"
                    value={editVideoProductPrice}
                    onChange={(e) => setEditVideoProductPrice(e.target.value)}
                    placeholder="Enter product price..."
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Product URL</label>
                  <input 
                    type="text"
                    value={editVideoProductUrl}
                    onChange={(e) => setEditVideoProductUrl(e.target.value)}
                    placeholder="Enter product URL..."
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Category</label>
                  <select 
                    value={editVideoCategoryId}
                    onChange={(e) => setEditVideoCategoryId(e.target.value)}
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors appearance-none"
                  >
                    <option value="" disabled>Select category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Hashtags / Tags (comma separated)</label>
                  <textarea 
                    value={editVideoTags}
                    onChange={(e) => setEditVideoTags(e.target.value)}
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors h-20 resize-none font-mono text-sm leading-relaxed"
                  />
                </div>
                
                {editVideoError && (
                   <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-xs text-red-500 text-center font-medium">{editVideoError}</p>
                   </div>
                )}
              </div>
              
              <button type="button" aria-label="button" 
                onClick={handleSaveVideoEdit}
                disabled={isEditingVideo}
                className="w-full mt-8 py-3.5 bg-white hover:bg-zinc-200 text-black font-semibold font-sans text-sm rounded-xl transition-all flex items-center justify-center disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-white/5"
              >
                {isEditingVideo ? <Loader2 className="size-5 animate-spin" /> : 'Save Changes'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Profile Picture Cropper Modal */}
      {cropperSrc && (
        <ProfileImageCropper
          imageSrc={cropperSrc}
          fileName={pendingFileName}
          onCropCompleted={(croppedFile, croppedPreviewUrl) => {
            setAvatarObj({
              file: croppedFile,
              preview: croppedPreviewUrl
            });
            setCropperSrc(null);
          }}
          onCancel={() => {
            setCropperSrc(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        />
      )}
    </div>
  );
}
