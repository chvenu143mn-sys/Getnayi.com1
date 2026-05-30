import React, { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Loader2, Link as LinkIcon, Edit3, Volume2, VolumeX, CheckCircle, RefreshCw, Trash2, ArrowLeft, Image as ImageIcon, Camera, X, BadgeCheck, FileText, Globe, ShieldCheck, AlertCircle, Search, PlusCircle, Tag, ChevronRight, User, Building } from 'lucide-react';
import { cn } from '../lib/utils';
import * as tus from 'tus-js-client';
import { Profile, CreatorApplication } from '../types';
import validator from 'validator';
import { GuestGate } from '../components/GuestGate';
import { m as motion, AnimatePresence } from 'motion/react';

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [application, setApplication] = useState<CreatorApplication | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'loading' | 'unauthorized' | 'pending' | 'rejected' | 'approved'>('loading');

  const [appPortfolioUrl, setAppPortfolioUrl] = useState('');
  const [appSocialUrl, setAppSocialUrl] = useState('');
  const [appNotes, setAppNotes] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [onboardingType, setOnboardingType] = useState<'creator' | 'brand'>('creator');
  const [showForm, setShowForm] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [mainProductFile, setMainProductFile] = useState<File | null>(null);
  const [mainProductPreview, setMainProductPreview] = useState<string | null>(null);
  const [realLifeFile, setRealLifeFile] = useState<File | null>(null);
  const [realLifePreview, setRealLifePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [isUrlValid, setIsUrlValid] = useState(false);
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);
  const [isVerifyingUrl, setIsVerifyingUrl] = useState(false);
  const [urlMetadata, setUrlMetadata] = useState<{title: string, favicon: string, domain: string} | null>(null);
  const [uploadedVideoStatus, setUploadedVideoStatus] = useState<string | null>(null);
  
  // Custom structured product state fields
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productUses, setProductUses] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [keySpecs, setKeySpecs] = useState('');
  const [benefits, setBenefits] = useState('');
  const [whyRecommends, setWhyRecommends] = useState('');
  const [bestFor, setBestFor] = useState('');
  const [whatILiked, setWhatILiked] = useState('');
  const [thingsToKnow, setThingsToKnow] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponInstructions, setCouponInstructions] = useState('');
  const [couponTerms, setCouponTerms] = useState('');
  
  const [isMuted, setIsMuted] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationPopup, setValidationPopup] = useState<string[] | null>(null);
  const [showLinkWarning, setShowLinkWarning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [videoDuration, setVideoDuration] = useState(0);
  const [scrubValue, setScrubValue] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const [filmstripFrames, setFilmstripFrames] = useState<string[]>([]);
  const [showProductDrawer, setShowProductDrawer] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Validate URL as user types with debounce and backend resolution
  useEffect(() => {
    const verifyTimeout = setTimeout(async () => {
      let targetUrl = productUrl.trim();
      if (!targetUrl) {
        setIsUrlValid(false);
        setUrlValidationError(null);
        setUrlMetadata(null);
        setIsVerifyingUrl(false);
        return;
      }

      // Automatically prepends https:// if missing
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }

      setIsVerifyingUrl(true);
      setUrlValidationError(null);
      setUrlMetadata(null);

      if (!validator.isURL(targetUrl, { require_protocol: true, protocols: ['http', 'https'] })) {
        setIsUrlValid(false);
        setUrlValidationError('Please enter a valid HTTP/HTTPS URL.');
        setIsVerifyingUrl(false);
        return;
      }

      try {
        const url = new URL(targetUrl);
        const pathname = url.pathname.toLowerCase();
        const blockedExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.zip', '.rar', '.mp3', '.wav'];
        
        if (blockedExtensions.some(ext => pathname.endsWith(ext))) {
           setIsUrlValid(false);
           setUrlValidationError('This must be a valid product page link, not a media file.');
           setIsVerifyingUrl(false);
           return;
        }

        const hostname = url.hostname.toLowerCase();
        const isIpAddress = validator.isIP(hostname);
        if (hostname === 'localhost' || hostname === '127.0.0.1' || isIpAddress || hostname.includes('ngrok.io')) {
           setIsUrlValid(false);
           setUrlValidationError('Local or IP addresses are not allowed.');
           setIsVerifyingUrl(false);
           return;
        }

        const response = await fetch('/api/link-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl })
        });

        if (!response.ok) {
           const errData = await response.json().catch(()=>({}));
           throw new Error(errData.error || 'Failed to verify URL');
        }

        const data = await response.json();
        
        setIsUrlValid(true);
        setUrlMetadata({
          title: data.title,
          favicon: data.favicon,
          domain: data.domain
        });

      } catch (e: any) {
        setIsUrlValid(true); // structurally valid, but couldn't verify. We'll still allow it but without rich preview.
        setUrlValidationError('Could not verify store details, but you can still upload for review.');
      } finally {
        setIsVerifyingUrl(false);
      }
    }, 800);

    return () => clearTimeout(verifyTimeout);
  }, [productUrl]);

  // Extract frames when video is ready
  useEffect(() => {
    if (preview && videoDuration > 0) {
      let isMounted = true;
      const generateFilmstrip = async () => {
        const video = document.createElement('video');
        video.src = preview;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';

        const frames: string[] = [];
        const count = 7;
        const interval = videoDuration / (count + 1);

        const canvas = document.createElement('canvas');
        
        for (let i = 1; i <= count; i++) {
          if (!isMounted) break;
          video.currentTime = interval * i;
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                resolve();
            };
            video.addEventListener('seeked', onSeeked);
          });
          if (i === 1) { 
             canvas.width = 60; // low res for filmstrip thumbnail
             canvas.height = 60 * (video.videoHeight / video.videoWidth);
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
             frames.push(canvas.toDataURL('image/jpeg', 0.5));
          }
        }
        if (isMounted) {
          setFilmstripFrames(frames);
        }
      };
      generateFilmstrip();
      return () => { isMounted = false; };
    } else {
      setFilmstripFrames([]);
    }
  }, [preview, videoDuration]);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('id, name').order('created_at', { ascending: true });
      if (data) {
        setCategories(data);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    async function fetchStatus() {
      try {
        // Intercept chvenu143mn@gmail.com - auto-approve, activate full admin & creator privileges
        if (user.email?.toLowerCase() === 'chvenu143mn@gmail.com') {
          try {
            await fetch('/api/user/grant-and-approve', { method: 'POST' });
          } catch (e) {
            console.error("Failed to sync backend approval status:", e);
          }
          setApprovalStatus('approved');
          setApplication({
            id: 'auto-admin-app',
            user_id: user.id,
            status: 'approved',
            portfolio_url: '',
            social_url: '',
            notes: 'Automated Creator/Admin Approval',
            created_at: new Date().toISOString()
          });
          setProfile({
            id: user.id,
            username: user.user_metadata?.username || 'admin',
            avatar_url: user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.id,
            bio: 'Administrator',
            can_upload: true,
            is_admin: true,
            created_at: new Date().toISOString()
          });
          return;
        }

        // get profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileData?.can_upload || profileData?.is_admin) {
           setApprovalStatus('approved');
           setProfile(profileData);
           return;
        }
        
        // if not approved, check applications
        const { data: apps, error } = await supabase
          .from('creator_applications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (error) {
           console.log("No creator apps schema or error", error);
           setApprovalStatus('unauthorized');
        } else if (apps && apps.length > 0) {
           const latestApp = apps[0];
           setApplication(latestApp);
           if (latestApp.status === 'pending') setApprovalStatus('pending');
           else if (latestApp.status === 'rejected') setApprovalStatus('rejected');
           else setApprovalStatus('unauthorized'); // fallback
        } else {
           setApprovalStatus('unauthorized');
        }
        setProfile(profileData);
      } catch (err) {
        console.error("fetchStatus error", err);
        setApprovalStatus('unauthorized');
      }
    }
    
    fetchStatus();
  }, [user]);

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmittingApp(true);
    setError(null);
    try {
      const finalNotes = onboardingType === 'brand'
        ? `Role: Brand\n\nNotes:\n${appNotes}`
        : `Role: Creator\n\nNotes:\n${appNotes}`;

      const { data, error } = await supabase
        .from('creator_applications')
        .insert({
           user_id: user.id,
           portfolio_url: appPortfolioUrl,
           social_url: appSocialUrl,
           notes: finalNotes,
           status: 'pending'
        })
        .select()
        .single();
        
      if (error) throw error;
      setApplication(data);
      setApprovalStatus('pending');
    } catch (err: any) {
       setError(err.message || 'Failed to submit application.');
    } finally {
       setIsSubmittingApp(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const errs: string[] = [];
      const MAX_SIZE = 50 * 1024 * 1024;
      const MAX_DURATION = 60;
      
      if (!selected.type.startsWith('video/')) {
        errs.push('File must be a valid video format (mp4, mov, etc.).');
      }

      const tempUrl = URL.createObjectURL(selected);
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      
      const checkAndShowErrors = (duration?: number) => {
        if (selected.size > MAX_SIZE) {
          errs.push('Video must be less than 50MB.');
        }
        
        if (duration !== undefined && duration > MAX_DURATION) {
          errs.push('Video duration exceeds 60 seconds maximum limit.');
        }

        if (errs.length > 0) {
          setValidationPopup(errs);
          return false;
        }
        return true;
      };

      videoElement.onloadedmetadata = () => {
        URL.revokeObjectURL(tempUrl);
        if (checkAndShowErrors(videoElement.duration)) {
          setValidationPopup(null);
          setFile(selected);
          setPreview(URL.createObjectURL(selected));
          setError(null);
        }
      };
      
      videoElement.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        if (selected.type.startsWith('video/')) {
          errs.push('Invalid video file or failed to read duration metadata.');
        }
        checkAndShowErrors(undefined);
      };
      
      videoElement.src = tempUrl;
    }
  };

  const removeVideo = () => {
    setFile(null);
    setPreview(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setMainProductFile(null);
    setMainProductPreview(null);
    setRealLifeFile(null);
    setRealLifePreview(null);
    setVideoDuration(0);
    setScrubValue(0);
    setIsScrubbing(false);
    setError(null);
  };

  const captureFrame = () => {
    if (!previewVideoRef.current) return;
    const video = previewVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const frameFile = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
          setThumbnailFile(frameFile);
          setThumbnailPreview(URL.createObjectURL(frameFile));
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setValidationPopup([
          'Thumbnail file size exceeds 5MB maximum limit.'
        ]);
        return;
      }
      setThumbnailFile(selected);
      setThumbnailPreview(URL.createObjectURL(selected));
    }
  };

  const handleMainProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setValidationPopup([
          'Official Pic file size exceeds 5MB maximum limit.'
        ]);
        return;
      }
      setMainProductFile(selected);
      setMainProductPreview(URL.createObjectURL(selected));
    }
  };

  const handleRealLifeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setValidationPopup([
          'Creator Pic file size exceeds 5MB maximum limit.'
        ]);
        return;
      }
      setRealLifeFile(selected);
      setRealLifePreview(URL.createObjectURL(selected));
    }
  };

  const handleScrubStart = () => {
    setIsScrubbing(true);
    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
    }
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
    // Add small delay to ensure video frame is fully rendered after seek
    setTimeout(() => {
      captureFrame();
    }, 100);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setScrubValue(time);
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = time;
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    if (previewVideoRef.current) {
      previewVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleUpload = async (e?: React.FormEvent, forceUnverified: boolean = false) => {
    if (e) e.preventDefault();
    if (!file || !user || !isUrlValid || !mainProductFile || isUploading) return;

    if (!forceUnverified) {
      let cleanProductUrl = productUrl.trim();
      if (!/^https?:\/\//i.test(cleanProductUrl)) {
         cleanProductUrl = 'https://' + cleanProductUrl;
      }
      try {
        const parsed = new URL(cleanProductUrl);
        const host = parsed.hostname.toLowerCase();
        const knownMarketplaces = ['amazon', 'flipkart', 'myntra', 'shopify', 'ajio', 'meesho', 'nykaa', 'tatacliq', 'snapdeal', 'ebay', 'etsy', 'aliexpress', 'zara', 'hm', 'nike', 'adidas', 'puma', 'macys', 'walmart', 'target', 'bestbuy', 'apple', 'samsung'];
        const isMarketplace = knownMarketplaces.some(mp => host.includes(mp));
        const isProductPath = ['/p/', '/product/', '/item/', '/dp/', '/buy/'].some(p => parsed.pathname.toLowerCase().includes(p));
        if (!isMarketplace && !isProductPath) {
          setShowLinkWarning(true);
          return;
        }
      } catch (err) {}
    }

    setIsUploading(true);
    setProgress(10);
    setError(null);

    let createdBunnyVideoId: string | null = null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Bunny Stream via Direct TUS
      setProgress(0);
      
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      
      const createRes = await fetch('/api/bunny/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: file.name })
      });
      
      if (!createRes.ok) {
        const text = await createRes.text();
        throw new Error(`Failed to initialize upload: ${text}`);
      }
      
      const createData = await createRes.json();
      const { videoId, libraryId, deliveryHostname, expirationTime, signature } = createData;
      createdBunnyVideoId = videoId;

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `https://video.bunnycdn.com/tusupload`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire: expirationTime,
            VideoId: videoId,
            LibraryId: libraryId,
          },
          chunkSize: 5 * 1024 * 1024, // 5MB chunks
          metadata: {
            filetype: file.type,
            title: file.name,
          },
          onError: (error) => reject(error),
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = (bytesUploaded / bytesTotal) * 40;
            setProgress(percentage);
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      setProgress(40);
      
      const videoUrl = `https://${deliveryHostname}/${videoId}/playlist.m3u8`;

      const uploadImageToBunny = async (f: File) => {
        // Step 1: Get presigned URL
        const presignRes = await fetch('/api/bunny/presign-image', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ filename: f.name })
        });
        if (!presignRes.ok) throw new Error('Failed to generate presigned URL');
        const { presignedUrl } = await presignRes.json();
        
        // Step 2: PUT blob directly
        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: f
        });
        if (!uploadRes.ok) throw new Error('Failed to upload blob');
        const uploadData = await uploadRes.json();
        return uploadData.url;
      };

      let customThumbnailUrl = null;
      let finalMainProductImageUrl = null;
      let finalRealLifeImageUrl = null;
      
      if (thumbnailFile) {
        setProgress(45);
        customThumbnailUrl = await uploadImageToBunny(thumbnailFile);
      }

      if (mainProductFile) {
        setProgress(50);
        finalMainProductImageUrl = await uploadImageToBunny(mainProductFile);
      }

      if (realLifeFile) {
        setProgress(55);
        finalRealLifeImageUrl = await uploadImageToBunny(realLifeFile);
      }

      setProgress(60);

      // Auto-prefix product URL with https:// if it lacks a protocol, upgrade http to https
      let submitProductUrl = productUrl.trim();
      if (submitProductUrl.startsWith('http://')) {
        submitProductUrl = submitProductUrl.replace('http://', 'https://');
      } else if (!/^https:\/\//i.test(submitProductUrl)) {
        submitProductUrl = 'https://' + submitProductUrl;
      }

      // Insert into DB using backend for strict URL validation
      const insertResponse = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.data.session?.access_token}`
        },
        body: JSON.stringify({
          video_url: videoUrl,
          thumbnail_url: customThumbnailUrl || undefined,
          main_product_image_url: finalMainProductImageUrl || undefined,
          caption: JSON.stringify({
            captionText: DOMPurify.sanitize(caption.trim()),
            product_name: DOMPurify.sanitize(productName.trim()),
            product_price: productPrice ? parseFloat(productPrice.replace(/[^\d.]/g, '')) : null,
            product_uses: DOMPurify.sanitize(productUses.trim()),
            key_specifications: DOMPurify.sanitize(keySpecs.trim()),
            benefits: DOMPurify.sanitize(benefits.trim()),
            why_recommends: DOMPurify.sanitize(whyRecommends.trim()),
            best_for: DOMPurify.sanitize(bestFor.trim()),
            what_liked: DOMPurify.sanitize(whatILiked.trim()),
            things_know: DOMPurify.sanitize(thingsToKnow.trim()),
            coupon_code: DOMPurify.sanitize(couponCode.trim().toUpperCase()),
            coupon_instructions: DOMPurify.sanitize(couponInstructions.trim()),
            coupon_terms: DOMPurify.sanitize(couponTerms.trim())
          }),
          product_url: DOMPurify.sanitize(submitProductUrl),
          real_life_image_url: finalRealLifeImageUrl || undefined,
          is_verified_real: finalRealLifeImageUrl ? true : false,
          force_unverified_url: forceUnverified,
          category_id: categoryId || undefined
        })
      });

      const insertData = await insertResponse.json();
      
      if (!insertResponse.ok) {
        throw new Error(insertData.error || 'Failed to publish video');
      }

      setUploadedVideoStatus(insertData.status || 'active');
      setProgress(100);
      setIsSuccess(true);
      
      // Navigate to profile to see the new video after short delay
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to publish video');
      
      if (createdBunnyVideoId) {
        // Attempt to clean up the orphaned video on Bunny Stream
        fetch(`/api/bunny/delete/${createdBunnyVideoId}`, { method: 'DELETE' })
          .then(res => res.json())
          .then(() => console.log(`Cleaned up failed video upload ${createdBunnyVideoId}`))
          .catch(cleanupErr => console.error('Failed to cleanup Bunny video:', cleanupErr));
      }
      
      setIsUploading(false);
    }
  };

  if (approvalStatus === 'loading') {
    return (
      <div className="flex-1 w-full bg-[#0c0c0e] text-white pt-safe flex flex-col h-full font-sans">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col px-6 pb-8">
          {/* Header */}
          <header className="flex items-center justify-between py-6 sticky top-0 bg-[#0c0c0e] z-15">
            <button type="button" aria-label="button"  className="text-zinc-500 p-1 cursor-not-allowed" disabled>
              <ArrowLeft className="size-6" strokeWidth={2.5} />
            </button>
            <h1 className="text-[17px] font-semibold tracking-wide text-zinc-400 text-center flex-1 pr-6">
              Checking status...
            </h1>
          </header>

          <div className="flex-1 flex flex-col">
            {/* Step Indicators with soft pulsing matching the actual UI layout */}
            <div className="w-full flex items-center justify-between max-w-[280px] mx-auto mt-2 mb-10 relative px-2">
              <div className="absolute top-[18px] left-[30px] right-[30px] h-[1px] bg-zinc-800 -z-5" />
              
              {/* Stage 1: Apply */}
              <div className="flex flex-col items-center gap-2 animate-pulse">
                <div className="size-[36px] rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-[14px] text-zinc-600">
                  1
                </div>
                <span className="text-[12px] font-medium tracking-wide text-zinc-500">Apply</span>
              </div>

              {/* Stage 2: Review */}
              <div className="flex flex-col items-center gap-2 animate-pulse delay-75">
                <div className="size-[36px] rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-[14px] text-zinc-600">
                  2
                </div>
                <span className="text-[12px] font-medium tracking-wide text-zinc-500">Review</span>
              </div>

              {/* Stage 3: Verified */}
              <div className="flex flex-col items-center gap-2 animate-pulse delay-150">
                <div className="size-[36px] rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-[14px] text-zinc-600">
                  3
                </div>
                <span className="text-[12px] font-medium text-zinc-500 tracking-wide">Verified</span>
              </div>
            </div>

            {/* Skeleton Content Body */}
            <div className="flex-1 flex flex-col items-center text-center">
              {/* Pulsing Wavy Medallion Emblem */}
              <div className="size-24 rounded-full bg-[#1c1c1e] border-2 border-zinc-800/80 mb-6 flex items-center justify-center shadow-lg animate-pulse">
                <div className="size-12 rounded-full bg-zinc-800/50" />
              </div>

              {/* Title texts skeleton */}
              <div className="w-48 h-6 bg-zinc-900 rounded-md animate-pulse mb-3" />
              <div className="w-64 h-4 bg-zinc-900 rounded-md animate-pulse mb-8" />

              {/* Checklist skeleton card container */}
              <div className="w-full bg-[#111113] border border-zinc-800/80 rounded-[20px] p-5 flex flex-col gap-5 text-left shadow-md animate-pulse">
                {[
                  "w-1/2",
                  "w-2/3",
                  "w-5/12",
                  "w-3/4"
                ].map((widthClass, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="size-[18px] rounded-full bg-zinc-900 border border-zinc-800/60 shrink-0" />
                    <div className={cn("h-3.5 bg-zinc-800/40 rounded-md", widthClass)} />
                  </div>
                ))}
              </div>

              {/* CTA Button skeleton */}
              <div className="w-full h-[54px] bg-zinc-900 border border-zinc-800/50 rounded-2.5xl animate-pulse mt-10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (approvalStatus !== 'approved') {
    return (
      <div className="flex-1 w-full bg-[#0c0c0e] text-white pt-safe flex flex-col h-full font-sans">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col px-6 pb-8">
          {/* Header resembling the image */}
          <header className="flex items-center justify-between py-6 sticky top-0 bg-[#0c0c0e] z-15">
            <button type="button" aria-label="button"  
              onClick={() => {
                if (showForm) {
                  setShowForm(false);
                } else {
                  navigate(-1);
                }
              }} 
              className="text-white hover:text-zinc-300 transition-colors p-1"
            >
              <ArrowLeft className="size-6" strokeWidth={2.5} />
            </button>
            <h1 className="text-[17px] font-semibold tracking-wide text-white text-center flex-1 pr-6">
              {onboardingType === 'creator' ? "Creator Verification" : "Brand Verification"}
            </h1>
          </header>

          <div className="flex-1 flex flex-col">
            {/* Step Indicators perfectly matching prompt image */}
            <div className="w-full flex items-center justify-between max-w-[280px] mx-auto mt-2 mb-10 relative px-2">
              <div className="absolute top-[18px] left-[30px] right-[30px] h-[1px] bg-zinc-800 -z-5" />
              
              {/* Step 1: Apply */}
              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  "size-[36px] rounded-full flex items-center justify-center font-bold text-[14px] transition-all duration-300",
                  (approvalStatus === 'unauthorized' || approvalStatus === 'rejected' || approvalStatus === 'pending')
                    ? "bg-[#ef2950] text-white shadow-[0_0_15px_rgba(239,41,80,0.4)]"
                    : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                )}>
                  1
                </div>
                <span className={cn(
                  "text-[12px] font-medium tracking-wide",
                  (approvalStatus === 'unauthorized' || approvalStatus === 'rejected') ? "text-white" : "text-zinc-500"
                )}>
                  Apply
                </span>
              </div>

              {/* Step 2: Review */}
              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  "size-[36px] rounded-full flex items-center justify-center font-bold text-[14px] transition-all duration-300",
                  approvalStatus === 'pending'
                    ? "bg-[#ef2950] text-white shadow-[0_0_15px_rgba(239,41,80,0.4)]"
                    : "bg-[#161618] text-zinc-500 border border-zinc-800"
                )}>
                  2
                </div>
                <span className={cn(
                  "text-[12px] font-medium tracking-wide",
                  approvalStatus === 'pending' ? "text-white" : "text-zinc-500"
                )}>
                  Review
                </span>
              </div>

              {/* Step 3: Verified */}
              <div className="flex flex-col items-center gap-2">
                <div className="size-[36px] rounded-full bg-[#161618] text-zinc-500 font-bold text-[14px] flex items-center justify-center border border-zinc-800">
                  3
                </div>
                <span className="text-[12px] font-medium text-zinc-500 tracking-wide">
                  Verified
                </span>
              </div>
            </div>

            {/* Check progress state / Pending details */}
            {approvalStatus === 'pending' ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6">
                <div className="size-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20 shadow-lg shadow-amber-500/5">
                  <Loader2 className="size-8 animate-spin" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-white">Application Under Review</h3>
                <p className="text-zinc-400 text-[13.5px] leading-relaxed text-center max-w-xs px-2">
                  Our moderators are currently reviewing your submitted onboarding details. We will automatically activate your posting access as soon as your application is approved! You'll receive a confirmation email and in-app notification the moment you're ready to go.
                </p>
                <button type="button" aria-label="button"  
                  onClick={() => navigate('/')} 
                  className="mt-8 px-6 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800/80 transition-all"
                >
                  Return to Feed
                </button>
              </div>
            ) : (
              /* Unauthorized or Rejected state */
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* SEGMENT TOGGLE FOR CREATOR OR BRAND */}
                  {!showForm && (
                    <div className="flex bg-[#161618] p-1 rounded-xl border border-zinc-800 mb-8 max-w-[280px] mx-auto">
                      <button aria-label="button" 
                        type="button"
                        onClick={() => {
                          setOnboardingType('creator');
                          setError(null);
                        }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-300",
                          onboardingType === 'creator'
                            ? "bg-[#ef2950] text-white shadow-md shadow-[#ef2950]/15"
                            : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        <User className="size-3.5" />
                        Creator
                      </button>
                      <button aria-label="button" 
                        type="button"
                        onClick={() => {
                          setOnboardingType('brand');
                          setError(null);
                        }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-300",
                          onboardingType === 'brand'
                            ? "bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/15"
                            : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        <Building className="size-3.5" />
                        Brand
                      </button>
                    </div>
                  )}

                  {!showForm ? (
                    /* SCREEN A: Checklist view exactly matching user's uploaded mockup file */
                    <div className="flex flex-col items-center text-center">
                      
                      {/* Image Medallion / Wavy Seal Badge */}
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-[#f97316]/10 blur-2xl rounded-full" />
                        <svg className="size-24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Radial gradient backing for 3D metallic feel */}
                          <path d="M50 5C53.8 11.2 59.5 12.3 65.5 10.1C71.5 7.9 76.5 11.4 78 17.5C79.4 23.6 84.7 26.5 88.3 31.4C91.9 36.3 90.2 42.1 91 48.2C91.8 54.3 94.4 59.5 92.5 65.3C90.6 71.1 86 73.9 83 79.2C80 84.5 77.2 90.5 71.3 92.4C65.4 94.3 60.5 90.7 54.4 91.5C48.3 92.3 43.1 96.9 37.1 95C31.1 93.1 27.2 88.5 22 85C16.8 81.5 10.4 80.5 8 74.6C5.6 68.7 8.3 62.9 7 56.8C5.7 50.7 2.1 45.4 3.5 39.4C4.9 33.4 9.9 30.6 12 24.8C14.1 19 12.7 12.4 18.2 9.5C23.7 6.6 29.5 9.5 35.5 7.5C41.5 5.5 46.2-1.2 50 5Z" fill="url(#goldGrad)" className="drop-shadow-lg" />
                          <circle cx="50" cy="50" r="28" fill="#121214" stroke="url(#goldInner)" strokeWidth="1.5" />
                          
                          {/* Keyhole / Seal emblem inside the rosette */}
                          <path d="M50 34C45.5 34 42 37.5 42 42V46.5C39.5 46.5 38 48 38 50.5V61.5C38 64 39.5 65.5 42 65.5H58C60.5 65.5 62 64 62 61.5V50.5C62 48 60.5 46.5 58 46.5V42C58 37.5 54.5 34 50 34ZM45.5 42C45.5 39.5 47.5 37.5 50 37.5C52.5 37.5 54.5 39.5 54.5 42V46.5H45.5V42ZM50 52C51.4 52 52.5 53.1 52.5 54.5C52.5 55.5 51.9 56.4 51 56.8V61.5H49V56.8C48.1 56.4 47.5 55.5 47.5 54.5C47.5 53.1 48.6 52 50 52Z" fill="url(#redGrad)" />
                          
                          <defs>
                            <radialGradient id="goldGrad" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="#fca5a5" />
                              <stop offset="25%" stopColor="#f97316" />
                              <stop offset="70%" stopColor="#ea580c" />
                              <stop offset="100%" stopColor="#c2410c" />
                            </radialGradient>
                            <linearGradient id="goldInner" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#fed7aa" />
                              <stop offset="100%" stopColor="#ea580c" />
                            </linearGradient>
                            <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ef2950" />
                              <stop offset="100%" stopColor="#b91c1c" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>

                      {/* Headline titles matching image prompt */}
                      <h3 className="text-[20px] font-bold text-white tracking-wide mb-2.5">
                        Build trust. Get verified.
                      </h3>
                      <p className="text-[14px] text-zinc-400 tracking-wide leading-relaxed max-w-[280px] mb-8">
                        {onboardingType === 'creator'
                          ? "Verification helps your audience trust your recommendations."
                          : "Establish official authority as a validated Shopify brand store."}
                      </p>

                      {/* Checklist card with customized checks conforming to image mockup */}
                      <div className="w-full bg-[#111113] border border-zinc-800/80 rounded-[20px] p-5 flex flex-col gap-4 text-left shadow-md">
                        {[
                          onboardingType === 'creator' ? 'Verify your identity' : 'Establish store authority',
                          onboardingType === 'creator' ? 'Link social accounts' : 'Connect catalog endpoints',
                          onboardingType === 'creator' ? 'Show real presence' : 'Get verified badge badge-check',
                          'Agree to guidelines'
                        ].map((text, i) => (
                          <div key={i} className="flex items-center gap-3.5">
                            <div className="size-[18px] rounded-full bg-[#ef2950]/15 border border-[#ef2950]/30 flex items-center justify-center shrink-0">
                              <svg className="size-2.5 text-[#ef2950]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="text-[14px] font-medium text-zinc-200 tracking-wide">{text}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <button type="button" aria-label="button"  
                        onClick={() => setShowForm(true)}
                        className="w-full mt-10 py-[17px] bg-[#ef2950] text-white font-semibold text-[15px] tracking-wide rounded-2.5xl flex items-center justify-center hover:bg-[#d61e40] transition-all duration-300 shadow-lg shadow-[#ef2950]/20 active:scale-[0.98]"
                      >
                        Start Verification
                      </button>
                    </div>
                  ) : (
                    /* SCREEN B: Under-the-hood Onboarding form input fields */
                    <form onSubmit={submitApplication} className="gap-y-5 animate-fadeIn">
                      <div className="mb-4">
                        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-widest font-bold">Step 1 — Submit Profile Links</p>
                        <h2 className="text-lg font-bold text-zinc-100">
                          {onboardingType === 'creator' ? "Creator Details Form" : "Brand Profile Form"}
                        </h2>
                      </div>

                      <div className="gap-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 ml-1">
                          {onboardingType === 'creator' ? "Work Portfolio or Link" : "Official Brand Website / Catalog URL"}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <LinkIcon className="size-4 text-zinc-500" />
                          </div>
                          <input
                            type="url"
                            required
                            value={appPortfolioUrl}
                            onChange={(e) => setAppPortfolioUrl(e.target.value)}
                            placeholder={onboardingType === 'creator' ? "https://example.com/portfolio-or-social" : "https://brandstorefront.com"}
                            className="w-full bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-600 rounded-xl focus:ring-2 focus:ring-[#ef2950] focus:border-transparent py-3.5 pl-11 pr-4 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="gap-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 ml-1">
                          {onboardingType === 'creator' ? "Social profile handle link (Optional)" : "Official Brand Social Channel link"}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Globe className="size-4 text-zinc-500" />
                          </div>
                          <input
                            type="url"
                            required={onboardingType === 'brand'}
                            value={appSocialUrl}
                            onChange={(e) => setAppSocialUrl(e.target.value)}
                            placeholder={onboardingType === 'creator' ? "https://instagram.com/username" : "https://instagram.com/brandname"}
                            className="w-full bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-600 rounded-xl focus:ring-2 focus:ring-[#ef2950] focus:border-transparent py-3.5 pl-11 pr-4 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="gap-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 ml-1">
                          {onboardingType === 'creator' ? "Tell us about your style & vibe" : "Brand overview catalog details"}
                        </label>
                        <div className="relative">
                          <div className="absolute top-3.5 left-4 pointer-events-none">
                            <FileText className="size-4 text-zinc-500" />
                          </div>
                          <textarea
                            required
                            value={appNotes}
                            onChange={(e) => setAppNotes(e.target.value)}
                            placeholder={onboardingType === 'creator' ? "Tell us about yourself, your favorite product categories, or what inspires your try-on videos..." : "Introduce your brand catalog size, product categories, and goals for partnering with creators..."}
                            rows={4}
                            className="w-full bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-600 rounded-xl focus:ring-2 focus:ring-[#ef2950] focus:border-transparent py-3.5 pl-11 pr-4 outline-none transition-all resize-none"
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-medium">
                          {error}
                        </div>
                      )}

                      <div className="flex gap-4 pt-2">
                        <button aria-label="button" 
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="flex-1 border border-zinc-800 text-zinc-300 font-semibold py-4 rounded-xl hover:bg-zinc-900 transition-all font-sans text-sm"
                        >
                          Back
                        </button>
                        <button aria-label="button" 
                          type="submit"
                          disabled={isSubmittingApp}
                          className="flex-1 bg-[#ef2950] hover:bg-[#d61e40] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#ef2950]/20 flex justify-center items-center text-sm"
                        >
                          {isSubmittingApp ? <Loader2 className="size-5 animate-spin" /> : 'Request Access'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    if (uploadedVideoStatus === 'pending_review') {
      return (
        <div className="flex-1 w-full bg-[#0c0c0e] text-white flex flex-col h-full items-center justify-center p-6 text-center">
          <div className="size-20 bg-yellow-500/20 text-yellow-500 rounded-full flex flex-col items-center justify-center mb-6">
            <AlertCircle className="size-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Under Review</h2>
          <p className="text-zinc-400 text-center max-w-sm mb-6">
            Since this store is new to us, we’ll quickly review your post to keep the community safe.
          </p>
          <button type="button" aria-label="button"  
            onClick={() => navigate('/profile')}
            className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-colors"
          >
            Go to Profile
          </button>
        </div>
      );
    }

    return (
      <div className="flex-1 w-full bg-[#0c0c0e] text-white flex flex-col h-full items-center justify-center p-6">
        <div className="size-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle className="size-10" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Post is live!</h2>
        <p className="text-zinc-400 text-center max-w-xs">
          Your video is out there. Heading to your profile...
        </p>
      </div>
    );
  }

  if (!user) {
    return <GuestGate type="upload" />;
  }

  return (
    <div className="flex-1 w-full bg-[#0c0c0e] text-white flex flex-col h-full font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 pt-6 sticky top-0 bg-[#0c0c0e] z-20">
        <button type="button" aria-label="button"  onClick={() => navigate(-1)} className="text-white hover:text-zinc-300 transition-colors p-1 -ml-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-[17px] font-semibold tracking-wide">New Post</h1>
        <button type="button" aria-label="button"  onClick={() => navigate(-1)} className="text-white hover:text-zinc-300 transition-colors p-1 -mr-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </header>

      {/* Progress Dots */}
      <div className="px-8 py-2 mb-4">
        <div className="flex items-center justify-between relative">
           <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/10 -z-10" />
           <div className="size-5 rounded-full bg-[#ef2950] border-4 border-[#0c0c0e] flex items-center justify-center relative shadow-[0_0_10px_rgba(239,41,80,0.4)]">
             <div className="size-2 rounded-full bg-[#ef2950]" />
           </div>
           <div className="size-5 rounded-full bg-[#0c0c0e] border-2 border-white/20 flex items-center justify-center relative">
             <div className="size-1.5 rounded-full bg-transparent" />
           </div>
           <div className="size-5 rounded-full bg-[#0c0c0e] border-2 border-white/20 flex items-center justify-center relative">
             <div className="size-1.5 rounded-full bg-transparent" />
           </div>
           <div className="size-5 rounded-full bg-[#0c0c0e] border-2 border-white/20 flex items-center justify-center relative">
             <div className="size-1.5 rounded-full bg-transparent" />
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full px-5 pb-6">
        
        {/* Cover Photo Area - Replacing with actual video file upload */}
        <div className="relative w-full aspect-[16/10] bg-zinc-900 rounded-2xl overflow-hidden mb-6 border border-white/5 shadow-md flex items-center justify-center">
          {preview ? (
            <video src={preview} className="size-full object-cover" muted loop playsInline autoPlay />
          ) : (
            <div className="text-zinc-500 font-medium text-sm flex flex-col items-center">
               <UploadCloud className="size-8 mb-2" />
               Select a video
            </div>
          )}
          <input type="file" accept="video/*" onChange={handleFileChange} className="absolute inset-0 size-full opacity-0 cursor-pointer" />
        </div>

        {/* Video Cover Thumbnail Selection Section */}
        {preview && (
          <div className="flex flex-col bg-[#151518] p-4 rounded-2xl border border-white/5 shadow-sm gap-y-3 mb-6">
            <span className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide">Video Cover Thumbnail</span>
            <p className="text-xs text-zinc-500 leading-relaxed">
              By default, a thumbnail is automatically captured from your video. You can optionally upload a custom JPG or PNG cover image.
            </p>
            <div className="flex items-center gap-4">
              <div className="size-[84px] rounded-xl overflow-hidden border border-white/10 relative bg-zinc-900 shrink-0">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} className="size-full object-cover" alt="Thumbnail Preview" />
                ) : (
                  <div className="size-full flex items-center justify-center bg-zinc-900 text-zinc-650 text-xs">Generating...</div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-[12.5px] font-semibold text-white/95 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer text-center">
                  Upload Custom Cover
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleThumbnailChange} className="hidden" />
                </label>
                {thumbnailFile && (
                  <button aria-label="button" 
                    type="button"
                    onClick={() => {
                      setThumbnailFile(null);
                      captureFrame();
                    }}
                    className="text-xs text-red-500 hover:text-red-400 font-sans text-left pl-1"
                  >
                    Reset to Video Auto-Frame
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inputs */}
        <div className="gap-y-6">
          <div className="flex flex-col">
            <label className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide mb-2 pl-1">Product Link (Required) *</label>
            <div className="relative">
              <input 
                type="text" 
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="e.g. amazon.in/products/item or https://..."
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm pr-10"
              />
              {isVerifyingUrl && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <Loader2 className="size-4 text-zinc-400 animate-spin" />
                </div>
              )}
            </div>
            {isVerifyingUrl && (
              <p className="text-zinc-500 text-[11px] mt-1 pl-1 font-sans animate-pulse flex items-center gap-1">
                <RefreshCw className="size-3 animate-spin text-[#ef2950]" /> Verifying website link & scraping metadata...
              </p>
            )}
            {urlValidationError && !isVerifyingUrl && (
              <p className={cn(
                "text-xs mt-1 pl-1 font-sans flex items-start gap-1", 
                isUrlValid ? "text-amber-400" : "text-red-400"
              )}>
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <span>{urlValidationError}</span>
              </p>
            )}
            {urlMetadata && !isVerifyingUrl && (
              <div className="mt-2.5 p-3.5 bg-[#1a1a1f] rounded-2xl border border-emerald-500/10 flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2.5 min-w-0">
                  {urlMetadata.favicon ? (
                    <img 
                      src={urlMetadata.favicon} 
                      alt="Favicon" 
                      className="size-5 object-contain rounded shrink-0" 
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                    />
                  ) : (
                    <Globe className="size-5 text-zinc-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-zinc-200 text-xs font-semibold truncate font-sans">{urlMetadata.title}</p>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold font-mono">{urlMetadata.domain}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/10 px-2 py-0.5 rounded-full text-[10px] font-bold font-sans tracking-wide shrink-0">
                  <BadgeCheck className="size-3.5" /> VERIFIED
                </span>
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex flex-col">
            <label className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide mb-2 pl-1">Category *</label>
            <select 
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-[#151518] text-white/90 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm"
              required
            >
              <option value="" disabled>Select a category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide mb-2 pl-1">Product Name *</label>
            <input 
              type="text" 
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Premium Wireless Earbuds"
              className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide mb-2 pl-1">Product Price (INR ₹) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-sans font-bold text-[16px]">₹</span>
              <input 
                type="text" 
                required
                value={productPrice}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d]/g, '');
                  setProductPrice(val ? Number(val).toLocaleString('en-IN') : '');
                }}
                placeholder="999"
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl pl-8 pr-4 py-3.5 text-[15px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm font-semibold"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 pl-1">Enter numeric price. Formatting is applied automatically (e.g. ₹1,499)</p>
          </div>

          <div className="flex flex-col">
            <label className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide mb-2 pl-1">Why You Recommend This Product *</label>
            <textarea 
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Explain why you recommend this product, what makes it special, and who it's for..."
              className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm min-h-[90px]"
            />
          </div>

          <div className="border-t border-zinc-900 pt-6 gap-y-5">
            <h3 className="text-[15px] font-bold text-white pl-1 flex items-center gap-2">
              <svg className="size-4 text-[#ef2950]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Structured Product Information
            </h3>
            
            <div className="flex flex-col">
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Product Uses (Add bullet points)</label>
              <textarea 
                value={productUses}
                onChange={(e) => setProductUses(e.target.value)}
                placeholder="e.g.&#10;• Daily workspace wear&#10;• Perfect for heavy coding sessions&#10;• Traveling companion"
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm min-h-[90px]"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Key Specifications</label>
              <textarea 
                value={keySpecs}
                onChange={(e) => setKeySpecs(e.target.value)}
                placeholder="e.g.&#10;• Battery life: up to 30 hours&#10;• Bluetooth 5.2 connectivity&#10;• Sweat and dust proof"
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm min-h-[90px]"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Key Benefits</label>
              <textarea 
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                placeholder="e.g.&#10;• Reduces active outside ambient ear strain&#10;• Extremely pocket friendly lightweight design&#10;• Rich audio bass equalizer"
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm min-h-[90px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Best For</label>
                <input 
                  type="text"
                  value={bestFor}
                  onChange={(e) => setBestFor(e.target.value)}
                  placeholder="e.g. Techies, Audiophiles"
                  className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">What I Liked</label>
                <input 
                  type="text"
                  value={whatILiked}
                  onChange={(e) => setWhatILiked(e.target.value)}
                  placeholder="e.g. Fast Charging support"
                  className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Things to Know (Heads Up)</label>
              <textarea 
                value={thingsToKnow}
                onChange={(e) => setThingsToKnow(e.target.value)}
                placeholder="e.g. Passive call noise isolation only, requires USB-C charger (not in box)"
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm min-h-[60px]"
              />
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-6 gap-y-4">
            <h3 className="text-[15px] font-bold text-white pl-1 flex items-center gap-2">
              <svg className="size-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
              Coupon Code (Optional)
            </h3>

            <div className="flex flex-col">
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Promo Coupon Code</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={couponCode}
                  readOnly
                  placeholder="Click generate to create code"
                  className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm font-semibold uppercase tracking-widest text-emerald-400 opacity-80 cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    // Generate a strong, random 12-char alphanumeric code
                    const array = new Uint32Array(3);
                    window.crypto.getRandomValues(array);
                    const randomCode = Array.from(array, dec => ('0' + dec.toString(36)).substr(-4)).join('').toUpperCase();
                    setCouponCode(randomCode);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-xl text-[13px] font-bold whitespace-nowrap transition-colors"
                >
                  Generate
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 pl-1 mt-2">Codes must be complex to prevent brute-force guessing.</p>
            </div>

            <div className="flex flex-col">
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Coupon Instructions</label>
              <input 
                type="text"
                value={couponInstructions}
                onChange={(e) => setCouponInstructions(e.target.value)}
                placeholder="e.g. Valid on first order only, minimum purchase ₹2,000"
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Coupon Terms & Conditions</label>
              <input 
                type="text"
                value={couponTerms}
                onChange={(e) => setCouponTerms(e.target.value)}
                placeholder="e.g. Cannot be combined with other discounts. Apply during checkout."
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm"
              />
            </div>
          </div>

          <div className="flex flex-col border-t border-zinc-900 pt-6">
            <label className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide mb-3 pl-1">Product Image * (Official photo)</label>
            <div className="flex items-center gap-x-3 overflow-x-auto pb-1 scrollbar-none snap-x">
              {mainProductPreview && (
                <div className="size-[84px] rounded-2xl overflow-hidden shrink-0 snap-start border border-white/5 shadow-sm bg-zinc-900 relative">
                  <img src={mainProductPreview} className="size-full object-cover"  alt="" />
                  <button type="button" aria-label="button"  onClick={() => { setMainProductFile(null); setMainProductPreview(null); }} className="absolute top-1 right-1 bg-[#0c0c0e]/50 rounded-full p-1"><X className="size-4" /></button>
                </div>
              )}
              {!mainProductPreview && (
                <label className="size-[84px] rounded-2xl shrink-0 snap-start border border-white/10 bg-[#151518] flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer shadow-sm relative">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  <input type="file" accept="image/*" onChange={handleMainProductChange} className="hidden" />
                </label>
              )}
            </div>
          </div>
          
          <div className="flex flex-col">
            <label className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide mb-3 pl-1">Real Life Photo (Optional)</label>
            <div className="flex items-center gap-x-3 overflow-x-auto pb-1 scrollbar-none snap-x">
              {realLifePreview && (
                <div className="size-[84px] rounded-2xl overflow-hidden shrink-0 snap-start border border-white/5 shadow-sm bg-zinc-900 relative">
                  <img src={realLifePreview} className="size-full object-cover"  alt="" />
                  <button type="button" aria-label="button"  onClick={() => { setRealLifeFile(null); setRealLifePreview(null); }} className="absolute top-1 right-1 bg-[#0c0c0e]/50 rounded-full p-1"><X className="size-4" /></button>
                </div>
              )}
              {!realLifePreview && (
                <label className="size-[84px] rounded-2xl shrink-0 snap-start border border-white/10 bg-[#151518] flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer shadow-sm relative">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  <input type="file" accept="image/*" onChange={handleRealLifeChange} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Footer Action */}
      <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 shrink-0 bg-[#0c0c0e]">
         {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}
         <button type="button" aria-label="button"  
           onClick={handleUpload}
           disabled={!file || !isUrlValid || !mainProductFile || !productName.trim() || !productPrice.trim() || isUploading}
           className="w-full bg-[#ef2950] hover:bg-[#ff3b61] disabled:opacity-50 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center text-[16px] shadow-[0_4px_14px_rgba(239,41,80,0.5)] tracking-wide"
         >
           {isUploading ? <Loader2 className="size-5 animate-spin" /> : 'Publish Post'}
         </button>
      </div>

      {/* Modern High-End Validation Alert Popup Panel overlay */}
      {validationPopup && (
        <div className="fixed inset-0 bg-[#0c0c0e]/85 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn" onClick={(e) => { e.stopPropagation(); }}>
          <div className="bg-[#151518] border border-red-500/25 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl relative">
            <div className="size-12 bg-red-500/10 text-[#ef2950] rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-bold text-[17px] text-white mb-2 tracking-wide text-center">Video Format & Limit Warning</h3>
            <div className="gap-y-1.5 mb-6 text-zinc-400 text-xs leading-relaxed text-left max-h-[160px] overflow-y-auto pl-1 pr-1">
              {validationPopup.map((err, idx) => (
                <p key={idx} className="flex items-start gap-2 text-zinc-300">
                  <span className="text-[#ef2950] shrink-0 font-bold">•</span>
                  <span>{err}</span>
                </p>
              ))}
            </div>
            <button type="button" aria-label="button" 
              onClick={(e) => { e.stopPropagation(); setValidationPopup(null); }}
              className="w-full bg-[#ef2950] hover:bg-[#ff3b61] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_4px_10px_rgba(239,41,80,0.3)] hover:scale-[1.01]"
            >
              Understand & Adjust
            </button>
          </div>
        </div>
      )}

      {/* Link Verification Warning Popup */}
      {showLinkWarning && (
        <div className="fixed inset-0 bg-[#0c0c0e]/85 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn" onClick={(e) => { e.stopPropagation(); }}>
          <div className="bg-[#151518] border border-yellow-500/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl relative">
            <div className="size-12 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-bold text-[17px] text-white mb-2 tracking-wide text-center">Unrecognized Product Link</h3>
            <p className="text-zinc-400 text-sm leading-relaxed text-center mb-6">
              This link doesn't look like a standard e-commerce or product page. Are you sure you want to proceed? 
              <br/><br/>
              If you upload this, it will be flagged for &quot;Admin Verification&quot; and may experience delays in visibility.
            </p>
            <div className="flex flex-col gap-3">
              <button type="button" aria-label="button" 
                onClick={(e) => { e.stopPropagation(); setShowLinkWarning(false); }}
                className="w-full bg-[#ef2950] hover:bg-[#ff3b61] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_4px_10px_rgba(239,41,80,0.3)] hover:scale-[1.01]"
              >
                Change Link
              </button>
              <button type="button" aria-label="button" 
                onClick={(e) => { e.stopPropagation(); setShowLinkWarning(false); handleUpload(undefined, true); }}
                className="w-full bg-[#2a2a2f] hover:bg-[#35353c] text-white font-semibold py-3 px-4 rounded-xl transition-all hover:scale-[1.01]"
              >
                Upload Anyway (Needs Admin Review)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
