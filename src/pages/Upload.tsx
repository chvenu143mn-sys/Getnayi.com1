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
import { motion, AnimatePresence } from 'motion/react';
import { extractStoreName } from '../utils/videoUtils';
import { CreatorVerificationFlow } from '../components/upload/CreatorVerificationFlow';
import { UploadSuccessState } from '../components/upload/UploadSuccessState';

import { UploadAccordion } from '../components/upload/UploadAccordion';

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [application, setApplication] = useState<CreatorApplication | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'loading' | 'unauthorized' | 'pending' | 'rejected' | 'approved'>(() => {
    try {
      const supabaseKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
      if (supabaseKey) {
        const authDataStr = localStorage.getItem(supabaseKey);
        if (authDataStr) {
          const authData = JSON.parse(authDataStr);
          const email = authData?.user?.email;
          const id = authData?.user?.id;
          if (email?.toLowerCase() === 'chvenu143mn@gmail.com') {
            return 'approved';
          }
          if (id) {
            const cached = localStorage.getItem(`creator_approval_${id}`);
            if (cached === 'approved' || cached === 'pending' || cached === 'rejected' || cached === 'unauthorized') {
              return cached as any;
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return 'loading';
  });
  
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
  
  const [hashtags, setHashtags] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  
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
  
  const [expandedSection, setExpandedSection] = useState<string | null>('core');

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
          credentials: 'include',
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
    
    // Instantly check cache or special email to render without flickering loaders
    const isSpecialEmail = user.email?.toLowerCase() === 'chvenu143mn@gmail.com';
    if (isSpecialEmail) {
      setApprovalStatus('approved');
    } else {
      const cached = localStorage.getItem(`creator_approval_${user.id}`);
      if (cached === 'approved' || cached === 'pending' || cached === 'rejected' || cached === 'unauthorized') {
        setApprovalStatus(cached as any);
      }
    }
    
    async function fetchStatus() {
      try {
        // Intercept chvenu143mn@gmail.com - auto-approve, activate full admin & creator privileges
        if (user.email?.toLowerCase() === 'chvenu143mn@gmail.com') {
          try {
            const sessionData = await supabase.auth.getSession();
            const token = sessionData.data.session?.access_token;
            await fetch('/api/user/grant-and-approve', { 
              method: 'POST', 
              credentials: 'include',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
          } catch (e) {
            console.error("Failed to sync backend approval status:", e);
          }
          setApprovalStatus('approved');
          // Cache status in local storage
          localStorage.setItem(`creator_approval_${user.id}`, 'approved');
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
           localStorage.setItem(`creator_approval_${user.id}`, 'approved');
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
           localStorage.setItem(`creator_approval_${user.id}`, 'unauthorized');
        } else if (apps && apps.length > 0) {
           const latestApp = apps[0];
           setApplication(latestApp);
           if (latestApp.status === 'pending') {
             setApprovalStatus('pending');
             localStorage.setItem(`creator_approval_${user.id}`, 'pending');
           } else if (latestApp.status === 'rejected') {
             setApprovalStatus('rejected');
             localStorage.setItem(`creator_approval_${user.id}`, 'rejected');
           } else {
             setApprovalStatus('unauthorized'); // fallback
             localStorage.setItem(`creator_approval_${user.id}`, 'unauthorized');
           }
        } else {
           setApprovalStatus('unauthorized');
           localStorage.setItem(`creator_approval_${user.id}`, 'unauthorized');
        }
        setProfile(profileData);
      } catch (err) {
        console.error("fetchStatus error", err);
        setApprovalStatus('unauthorized');
        localStorage.setItem(`creator_approval_${user.id}`, 'unauthorized');
      }
    }
    
    fetchStatus();
  }, [user]);

  const handleExtractMetadata = async () => {
    if (!productUrl) {
      alert("Please enter a product URL first to extract metadata.");
      return;
    }
    setIsExtractingMetadata(true);
    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      
      const res = await fetch('/api/generate-metadata', {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_url: productUrl, caption })
      });
      if (!res.ok) throw new Error("Metadata generation failed.");
      
      const resData = await res.json();
      const generated = resData?.data;

      if (generated) {
        if (generated.hashtags) {
           setHashtags(Array.isArray(generated.hashtags) ? generated.hashtags.join(' ') : generated.hashtags);
        }
        if (generated.tags) {
           setTags(Array.isArray(generated.tags) ? generated.tags.join(', ') : generated.tags);
        }
        if (generated.suggested_caption) {
           setCaption(prev => prev || generated.suggested_caption);
        }
        if (generated.product_highlights) {
           setProductUses(prev => prev || generated.product_highlights);
           setExpandedSection('structured');
        }
        if (generated.honest_review_notes) {
           setThingsToKnow(prev => prev || generated.honest_review_notes);
           setExpandedSection('structured');
        }
        if (generated.categories && Array.isArray(generated.categories) && generated.categories.length > 0) {
           const aiCat = generated.categories[0].toLowerCase();
           const match = categories.find(c => c.name.toLowerCase().includes(aiCat) || aiCat.includes(c.name.toLowerCase()));
           if (match) {
             setCategoryId(match.id);
           }
        }
      }
    } catch (err: any) {
      console.error(err);
      alert("Could not generate AI metadata. Please try again.");
    } finally {
      setIsExtractingMetadata(false);
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
        credentials: 'include',
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
          credentials: 'include',
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

      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      const parsedHashtags = hashtags.split(' ').map(t => t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`).filter(t => t !== '#');
      const allTags = [...parsedTags, ...parsedHashtags];

      // Insert into DB using backend for strict URL validation
      const insertResponse = await fetch('/api/videos', {
        method: 'POST',
        credentials: 'include',
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
          category_id: categoryId || undefined,
          tags: allTags.length > 0 ? allTags : undefined
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
        fetch(`/api/bunny/delete/${createdBunnyVideoId}`, { method: 'DELETE', credentials: 'include' })
          .then(res => res.json())
          .then(() => console.log(`Cleaned up failed video upload ${createdBunnyVideoId}`))
          .catch(cleanupErr => console.error('Failed to cleanup Bunny video:', cleanupErr));
      }
      
      setIsUploading(false);
    }
  };

  if (approvalStatus === 'loading' || approvalStatus !== 'approved') {
    return <CreatorVerificationFlow approvalStatus={approvalStatus} setApprovalStatus={setApprovalStatus} />;
  }

  if (isSuccess) {
    return <UploadSuccessState uploadedVideoStatus={uploadedVideoStatus} />;
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
                    <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold font-mono flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span>{urlMetadata.domain}</span>
                      {extractStoreName(productUrl) && extractStoreName(productUrl) !== 'Store' && (
                        <>
                          <span className="text-zinc-700 font-sans">•</span>
                          <span className="text-emerald-400 font-sans font-bold normal-case">detected: {extractStoreName(productUrl)}</span>
                        </>
                      )}
                    </p>
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

          <UploadAccordion
            title="Search Discovery & Tags"
            icon={<Search className="size-5 text-purple-400" />}
            isOpen={expandedSection === 'search'}
            onToggle={() => setExpandedSection(expandedSection === 'search' ? null : 'search')}
          >
            <div className="flex items-center justify-end mb-2">
              <button 
                type="button" 
                onClick={handleExtractMetadata}
                disabled={isExtractingMetadata || !productUrl}
                className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-lg text-[12px] font-bold tracking-wide transition-colors disabled:opacity-50"
              >
                {isExtractingMetadata ? <Loader2 className="size-3.5 animate-spin" /> : <Tag className="size-3.5" />}
                Autofill Metadata
              </button>
            </div>
            
            <div className="flex flex-col">
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Hashtags</label>
              <input 
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="e.g. #fashion #style"
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Search Keywords / Tags</label>
              <input 
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. casual top, blue dress, pure cotton (comma separated)"
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm"
              />
            </div>
          </UploadAccordion>

          <UploadAccordion
            title="Structured Product Review"
            icon={<FileText className="size-5 text-[#ef2950]" />}
            isOpen={expandedSection === 'structured'}
            onToggle={() => setExpandedSection(expandedSection === 'structured' ? null : 'structured')}
          >
            <div className="flex flex-col">
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Key Highlights & Specs (Add bullet points)</label>
              <textarea 
                value={productUses}
                onChange={(e) => setProductUses(e.target.value)}
                placeholder="e.g.&#10;• Perfect for heavy coding sessions&#10;• Battery life: up to 30 hours&#10;• Extreme comfort and lightweight design"
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm min-h-[120px]"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Honest Review (Pros, Cons & Things to Know)</label>
              <textarea 
                value={thingsToKnow}
                onChange={(e) => setThingsToKnow(e.target.value)}
                placeholder="e.g. Loved the fast charging support and sound quality. Heads up: The ear tips take some time to align, requires a USB-C charger (not in box)."
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm min-h-[90px]"
              />
            </div>
          </UploadAccordion>

          <UploadAccordion
            title="Coupon & Discounts (Optional)"
            icon={<Tag className="size-5 text-emerald-400" />}
            isOpen={expandedSection === 'coupon'}
            onToggle={() => setExpandedSection(expandedSection === 'coupon' ? null : 'coupon')}
          >
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
              <label className="text-[13px] font-medium text-zinc-400 font-sans tracking-wide mb-2 pl-1">Coupon Details (Instructions & Terms)</label>
              <textarea 
                value={couponInstructions}
                onChange={(e) => setCouponInstructions(e.target.value)}
                placeholder="e.g. Valid on first order only, minimum purchase ₹2,000. Cannot be combined with other discounts."
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm min-h-[70px]"
              />
            </div>
          </UploadAccordion>

          <UploadAccordion
            title="Product Images & Verification"
            icon={<Camera className="size-5 text-blue-400" />}
            isOpen={expandedSection === 'images'}
            onToggle={() => setExpandedSection(expandedSection === 'images' ? null : 'images')}
          >
            <div className="flex flex-col">
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
          </UploadAccordion>
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
