import React, { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Loader2, Link as LinkIcon, Edit3, Volume2, VolumeX, CheckCircle, RefreshCw, Trash2, ArrowLeft, Image as ImageIcon, Camera, X, BadgeCheck, FileText, Globe, ShieldCheck, AlertCircle, Search, PlusCircle, Tag, ChevronRight, User, Building, Sparkles, ShoppingBag, Plus, Heart, Bookmark } from 'lucide-react';
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
  const previewModalVideoRef = useRef<HTMLVideoElement>(null);

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
  const [uploadStatusText, setUploadStatusText] = useState('Publishing...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationPopup, setValidationPopup] = useState<string[] | null>(null);
  const [showLinkWarning, setShowLinkWarning] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
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

        setProductName(prev => (!prev.trim() && data.productName) ? data.productName : prev);
        setProductPrice(prev => {
           if (!prev.trim() && data.productPrice) {
               const parsedNum = String(data.productPrice).replace(/[^0-9.]/g, '');
               return parsedNum || prev;
           }
           return prev;
        });
        if (data.productImage && !mainProductPreview) {
           setMainProductPreview(data.productImage);
           try {
             // Fetch via a backend proxy to avoid CORS
             const imgRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(data.productImage)}`);
             if (imgRes.ok) {
                const blob = await imgRes.blob();
                const file = new File([blob], 'product-image.jpg', { type: blob.type });
                setMainProductFile(file);
             }
           } catch(err) {
             console.warn('Failed to fetch product image blob', err);
           }
        }

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
        
        await new Promise((resolve, reject) => {
           video.onloadeddata = resolve;
           video.onerror = reject;
        });

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
      generateFilmstrip().catch(err => console.log('filmstrip error', err));
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
      let resData;
      try {
        resData = await res.json();
      } catch (e) {
        throw new Error(`Server returned an invalid response (${res.status}). It might be offline or deploying.`);
      }
      if (!res.ok) {
        throw new Error(resData.error || "Metadata generation failed.");
      }
      
      let generated;
      
      if (resData.is_fallback) {
         const scrapedText = resData.scrapedText || '';
         const prompt = `Analyze this e-commerce product and generate relevant metadata.
Product URL: "${productUrl}"
Available Context from page: "${scrapedText}"
User Provided Caption/Review: "${caption || ''}"

Based on the URL, available context, and any general knowledge you have about this URL or brand, generate a highly optimized set of metadata to categorize this content and improve search discovery. 

Even if the scraped context is limited or empty, use the URL domain, URL path, and any general knowledge to provide the best possible tags. DO NOT generate error messages or complaints in the tags (like "product information missing" or "context lacking"). If you truly have no information, provide generic e-commerce tags (e.g. "shopping", "product", "review") and a generic caption.

Generate ONLY a valid JSON object answering this shape exactly:
{
  "hashtags": ["#tag1", "#tag2"],
  "tags": ["keyword1", "keyword2"],
  "categories": ["category1"],
  "suggested_caption": "Engaging text here...",
  "product_highlights": "• Highlight 1\\n• Highlight 2\\n• Highlight 3",
  "honest_review_notes": "Pros:\\n...\\nCons:\\n...\\nThings to know:\\n..."
}`;
         // @ts-ignore
         if (typeof window.puter === 'undefined' || !window.puter.ai) {
             throw new Error("Puter.js is not loaded. Please wait a moment or reload the page.");
         }
         // @ts-ignore
         const puterRes = await window.puter.ai.chat(prompt);
         
         let textContent = puterRes?.message?.content || puterRes?.text || puterRes || '';
         if (typeof textContent !== 'string') textContent = JSON.stringify(textContent);
         
         let jsonStr = textContent.replace(/```json/gi, '').replace(/```/gi, '').trim();
         const firstBrace = jsonStr.indexOf('{');
         const lastBrace = jsonStr.lastIndexOf('}');
         if (firstBrace !== -1 && lastBrace !== -1) {
             jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
         }
         try {
             generated = JSON.parse(jsonStr);
         } catch (e) {
             throw new Error("AI returned invalid JSON format.");
         }
      } else {
         generated = resData.data || resData;
      }

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
      alert(err.message || "Could not generate AI metadata. Please try again.");
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
        if (checkAndShowErrors(videoElement.duration)) {
          setValidationPopup(null);
          setFile(selected);
          setPreview(tempUrl);
          setVideoDuration(videoElement.duration);
          setTrimStart(0);
          setTrimEnd(videoElement.duration);
          setError(null);
        } else {
          URL.revokeObjectURL(tempUrl);
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
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setMainProductFile(null);
    setMainProductPreview(null);
    setRealLifeFile(null);
    setRealLifePreview(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
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
        const knownMarketplaces = ['amazon', 'amzn', 'a.co', 'flipkart', 'myntra', 'shopify', 'ajio', 'meesho', 'nykaa', 'tatacliq', 'snapdeal', 'ebay', 'etsy', 'aliexpress', 'zara', 'hm', 'nike', 'adidas', 'puma', 'macys', 'walmart', 'target', 'bestbuy', 'apple', 'samsung', 'croma', 'reliancedigital'];
        const isMarketplace = knownMarketplaces.some(mp => host.includes(mp));
        const isProductPath = ['/p/', '/product/', '/item/', '/dp/', '/buy/', '/d/'].some(p => parsed.pathname.toLowerCase().includes(p));
        if (!isMarketplace && !isProductPath) {
          setShowLinkWarning(true);
          return;
        }
      } catch (err) {}
    }

    setIsUploading(true);
    setUploadStatusText('Initializing upload...');
    setProgress(5);
    setError(null);

    let createdBunnyVideoId: string | null = null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Bunny Stream via Direct TUS
      setProgress(5);
      setUploadStatusText('Uploading Video...');
      
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
      setUploadStatusText('Upload Complete. Processing Video...');
      
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
      setUploadStatusText('Generating Metadata...');

      // Auto-prefix product URL with https:// if it lacks a protocol, upgrade http to https
      let submitProductUrl = productUrl.trim();
      if (submitProductUrl.startsWith('http://')) {
        submitProductUrl = submitProductUrl.replace('http://', 'https://');
      } else if (!/^https:\/\//i.test(submitProductUrl)) {
        submitProductUrl = 'https://' + submitProductUrl;
      }

      // Auto-Generate Search Metadata & Discovery Signals using AI
      let aiTags: string[] = [];
      let aiProductUses = '';
      let aiReviewNotes = '';
      try {
        const metadataRes = await fetch('/api/generate-metadata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.data.session?.access_token}`
          },
          body: JSON.stringify({ product_url: submitProductUrl, caption })
        });
        if (metadataRes.ok) {
           const resData = await metadataRes.json();
           const generated = typeof resData.data === 'string' ? JSON.parse(resData.data) : (resData.data || resData);
           if (generated) {
              const fetchedHashtags = Array.isArray(generated.hashtags) ? generated.hashtags : [];
              const fetchedTags = Array.isArray(generated.tags) ? generated.tags : [];
              aiTags = [...fetchedHashtags, ...fetchedTags];
              if (generated.product_highlights) aiProductUses = generated.product_highlights;
              if (generated.honest_review_notes) aiReviewNotes = generated.honest_review_notes;
           }
        }
      } catch (err) {
        console.warn('Failed to auto-generate metadata in background:', err);
      }

      setUploadStatusText('Verifying Product Link & Running Safety Checks...');
      setProgress(85);

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
            product_uses: DOMPurify.sanitize(aiProductUses),
            things_know: DOMPurify.sanitize(aiReviewNotes),
            coupon_code: DOMPurify.sanitize(couponCode.trim().toUpperCase()),
            coupon_instructions: DOMPurify.sanitize(couponInstructions.trim()),
            coupon_terms: DOMPurify.sanitize(couponTerms.trim()),
            trim_start: trimStart,
            trim_end: trimEnd
          }),
          product_url: DOMPurify.sanitize(submitProductUrl),
          real_life_image_url: finalRealLifeImageUrl || undefined,
          is_verified_real: finalRealLifeImageUrl ? true : false,
          force_unverified_url: forceUnverified,
          category_id: categoryId || undefined,
          tags: aiTags.length > 0 ? aiTags : undefined
        })
      });

      let insertData;
      try {
        insertData = await insertResponse.json();
      } catch (e) {
        throw new Error(`Server connection failed (${insertResponse.status}) while saving video data.`);
      }
      
      if (!insertResponse.ok) {
        throw new Error(insertData.error || 'Failed to publish video');
      }

      let finalStatusMsg = 'Published';
      if (insertData.status === 'pending_review') {
        finalStatusMsg = 'Awaiting Admin Approval (link not verified)';
      } else if (insertData.status === 'processing') {
        finalStatusMsg = 'Processing Video in Background... (will be Published soon)';
      }

      setUploadedVideoStatus((insertData.status || 'active'));
      setUploadStatusText(finalStatusMsg);
      setProgress(100);
      setIsSuccess(true);
      
      // Navigate to profile to see the new video after short delay
      setTimeout(() => navigate('/profile'), 4500); // Increased delay so user reads the message
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

  if (!user) {
    return <GuestGate type="upload" />;
  }

  if (approvalStatus === 'loading' || approvalStatus !== 'approved') {
    return <CreatorVerificationFlow approvalStatus={approvalStatus} setApprovalStatus={setApprovalStatus} />;
  }

  if (isSuccess) {
    return <UploadSuccessState uploadedVideoStatus={uploadedVideoStatus} />;
  }

  
  useEffect(() => {
    if (showPreviewModal && previewModalVideoRef.current) {
       previewModalVideoRef.current.play().catch(e => console.log('modal play blocked', e));
    }
  }, [showPreviewModal]);

  
  useEffect(() => {
    if (preview && previewVideoRef.current) {
       previewVideoRef.current.play().catch(err => console.log('effect play blocked', err));
    }
  }, [preview]);

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
        
        {/* Cover Photo Area */}
        <div className="relative w-full aspect-[16/10] bg-zinc-900 rounded-2xl overflow-hidden mb-6 border border-white/5 shadow-md flex items-center justify-center">
          {preview ? (
            <>
              <video 
                ref={previewVideoRef}
                src={preview}
                preload="auto" 
                className="size-full object-cover" 
                muted={isMuted} 
                loop 
                playsInline 
                autoPlay 
                onError={(e) => {
                   console.error('Video Preview Error:', e.currentTarget.error);
                }}
                onLoadedData={(e) => {
                   console.log('Video Preview Loaded Data');
                   e.currentTarget.play().catch(err => console.log('play blocked main', err));
                }} 
                onTimeUpdate={(e) => {
                   const v = e.currentTarget;
                   if (trimEnd > 0 && v.currentTime >= trimEnd) {
                      v.currentTime = trimStart;
                   } else if (trimStart > 0 && v.currentTime < trimStart) {
                      v.currentTime = trimStart;
                   }
                }}
              />
              <button
                type="button"
                onClick={() => {
                   setFile(null);
                   setPreview(null);
                   setThumbnailFile(null);
                   setThumbnailPreview(null);
                }}
                className="absolute top-3 right-3 bg-black/60 p-2 rounded-full text-white/80 hover:text-white transition-colors z-10"
              >
                <Trash2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                   if (previewVideoRef.current) {
                      if (previewVideoRef.current.paused) {
                         previewVideoRef.current.play();
                      } else {
                         previewVideoRef.current.pause();
                      }
                   }
                }}
                className="absolute inset-0 size-full z-0"
                aria-label="Play/Pause"
              />
            </>
          ) : (
            <>
              <div className="text-zinc-500 font-medium text-sm flex flex-col items-center">
                 <UploadCloud className="size-8 mb-2" />
                 Select a video
              </div>
              <input type="file" accept="video/*" onChange={handleFileChange} className="absolute inset-0 size-full opacity-0 cursor-pointer z-10" />
            </>
          )}
        </div>

        {/* Video Trimmer */}
        {preview && videoDuration > 0 && (
          <div className="flex flex-col bg-[#151518] p-4 rounded-2xl border border-white/5 shadow-sm gap-y-3 mb-6">
            <span className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide flex justify-between items-center">
              Trim Video
              <span className="text-zinc-500 font-normal text-xs bg-black/20 px-2 py-1 rounded">
                {(trimEnd - trimStart).toFixed(1)}s length
              </span>
            </span>
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1">
                 <label className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-1 flex justify-between">
                   Start <span className="text-purple-400">{trimStart.toFixed(1)}s</span>
                 </label>
                 <input type="range" min={0} max={videoDuration} step={0.1} value={trimStart} onChange={e => {
                    const val = Number(e.target.value);
                    if (val < trimEnd) {
                       setTrimStart(val);
                       if (previewVideoRef.current) previewVideoRef.current.currentTime = val;
                    }
                 }} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                 <label className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-1 flex justify-between">
                   End <span className="text-purple-400">{trimEnd.toFixed(1)}s</span>
                 </label>
                 <input type="range" min={0} max={videoDuration} step={0.1} value={trimEnd} onChange={e => {
                    const val = Number(e.target.value);
                    if (val > trimStart) {
                       setTrimEnd(val);
                       if (previewVideoRef.current) previewVideoRef.current.currentTime = val;
                    }
                 }} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
              </div>
            </div>
          </div>
        )}

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
          {/* 3. Product Link */}
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
          </div>

          {/* 4. Tell Us Your Experience */}
          <div className="flex flex-col">
            <label className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide mb-2 pl-1">Tell Us Your Experience *</label>
            <textarea 
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Explain what makes this product special, who it's for..."
              className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm min-h-[90px]"
            />
          </div>

          {/* 5. Category */}
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

          {/* 6. Product Image & Real Photo & Coupon */}
          <div className="flex flex-col mt-2">
            <label className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide mb-3 pl-1">Product Images</label>
            <div className="flex gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[12px] text-zinc-500 font-medium pl-1">Product Photo *</span>
                {mainProductPreview ? (
                  <div className="size-[84px] rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-sm bg-zinc-900 relative">
                    <img src={mainProductPreview} className="size-full object-cover"  alt="" />
                    <button type="button" aria-label="button" onClick={() => { setMainProductFile(null); setMainProductPreview(null); }} className="absolute top-1 right-1 bg-[#0c0c0e]/50 rounded-full p-1"><X className="size-4" /></button>
                  </div>
                ) : (
                  <label className="size-[84px] rounded-2xl shrink-0 border border-white/10 bg-[#151518] flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer shadow-sm relative">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    <input type="file" accept="image/*" onChange={handleMainProductChange} className="hidden" />
                  </label>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[12px] text-zinc-500 font-medium pl-1">Real Photo (Optional)</span>
                {realLifePreview ? (
                  <div className="size-[84px] rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-sm bg-zinc-900 relative">
                    <img src={realLifePreview} className="size-full object-cover"  alt="" />
                    <button type="button" aria-label="button" onClick={() => { setRealLifeFile(null); setRealLifePreview(null); }} className="absolute top-1 right-1 bg-[#0c0c0e]/50 rounded-full p-1"><X className="size-4" /></button>
                  </div>
                ) : (
                  <label className="size-[84px] rounded-2xl shrink-0 border border-white/10 bg-[#151518] flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer shadow-sm relative">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    <input type="file" accept="image/*" onChange={handleRealLifeChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col mt-4">
             <label className="text-[14px] font-medium text-zinc-300 font-sans tracking-wide mb-2 pl-1">Promo Coupon (Optional)</label>
             <div className="flex gap-2 mb-3">
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
             <textarea 
                value={couponInstructions}
                onChange={(e) => setCouponInstructions(e.target.value)}
                placeholder="Coupon Details & Terms (e.g. Valid on first order only)"
                className="w-full bg-[#151518] text-white/90 placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none border border-white/5 font-sans tracking-wide shadow-sm min-h-[70px]"
             />
          </div>
          
          <div className="bg-[#101014] border border-white/5 rounded-2xl p-4 mt-2">
            <h4 className="text-[14px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-1 flex items-center gap-2">
              <Sparkles className="size-4 text-purple-400" />
              AI Discovery & Smart Tags
            </h4>
            <p className="text-[12px] text-zinc-400 leading-relaxed font-sans mt-2">
              Based on the URL, video, and your review, our AI will automatically structure this product, generate search metadata, find optimal hashtags, and generate discovery signals behind the scenes!
            </p>
          </div>
        </div>

      </div>

      {/* Footer Action */}
      <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 shrink-0 bg-[#0c0c0e]">
         {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}
         <div className="flex gap-3">
           <button type="button" aria-label="Preview" 
             onClick={() => setShowPreviewModal(true)}
             disabled={!preview}
             className="w-1/3 bg-[#151518] hover:bg-[#1a1a20] active:scale-[0.98] border border-white/10 disabled:opacity-50 text-white font-bold py-4 px-2 rounded-2xl transition-all text-[15px] shadow-sm flex items-center justify-center gap-2"
           >
             Preview
           </button>
           <button type="button" aria-label="button"  
             onClick={handleUpload}
             disabled={!file || !isUrlValid || !mainProductFile || !productName.trim() || !productPrice.trim() || isUploading}
             className="flex-1 w-full bg-[#ef2950] hover:bg-[#ff3b61] disabled:opacity-50 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center text-[16px] shadow-[0_4px_14px_rgba(239,41,80,0.5)] tracking-wide"
           >
             {isUploading ? <Loader2 className="size-5 animate-spin" /> : 'Publish Post'}
           </button>
         </div>
      </div>

      {/* Full-Screen Loading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-[#0c0c0e]/90 backdrop-blur-md z-[120] flex flex-col items-center justify-center p-6 animate-fadeIn">
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            <div className="relative size-20">
              <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
              <svg className="absolute inset-0 size-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle 
                  cx="50" cy="50" r="46" 
                  className="fill-none stroke-[#ef2950] transition-all duration-300 ease-out"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 2.89} 289`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold font-sans text-xl">
                 {Math.round(progress)}%
              </div>
            </div>
            
            <div className="text-center flex flex-col items-center gap-1.5 w-full">
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                 <Loader2 className="size-5 animate-spin text-[#ef2950]" /> 
                 {uploadStatusText}
              </h3>
              <p className="text-zinc-400 text-[13px] text-center max-w-[280px]">
                 Please stay on this page while we process your content.
              </p>
            </div>
          </div>
        </div>
      )}

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

      
      {/* Feed Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-[200] bg-black flex flex-col"
          >
            {/* Fake Feed Header */}
            <div className="absolute top-0 left-0 w-full z-20 pt-safe flex justify-between items-center p-4 bg-gradient-to-b from-black/50 to-transparent">
              <button title="Go Back" type="button" aria-label="Close" onClick={() => setShowPreviewModal(false)} className="text-white hover:text-white/80 p-1">
                <ArrowLeft className="size-6 drop-shadow-md" />
              </button>
              <div className="flex gap-5 drop-shadow-md font-sans">
                 <span className="text-white font-bold text-[17px] tracking-wide relative after:content-[''] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-1 after:bg-white after:rounded-full">For You</span>
                 <span className="text-white/60 font-bold text-[17px] tracking-wide">Following</span>
              </div>
              <div className="w-8 flex justify-end">
                <Search className="size-6 text-white drop-shadow-md" />
              </div>
            </div>
            
            <div className="relative flex-1 bg-black overflow-hidden h-full">
              <video 
                ref={previewModalVideoRef}
                src={preview || undefined} 
                className="w-full h-full object-cover" 
                autoPlay 
                loop 
                muted={isMuted}
                playsInline
                preload="auto"
                onLoadedData={(e) => {
                   e.currentTarget.play().catch(err => console.log('play blocked', err));
                }}
              />

              {/* Feed Text/Controls Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

              {/* Bottom Left Info Panel */}
              <div className="absolute bottom-[80px] left-0 right-[60px] p-4 flex flex-col justify-end z-10 pointer-events-auto pb-safe">
                <div className="flex items-center">
                  <span className="font-bold text-white text-[16px] tracking-wide drop-shadow-md">
                    {user?.user_metadata?.username || 'user'}
                  </span>
                </div>
                {caption && (
                  <div className="mt-2 text-left pointer-events-auto">
                    <p className="text-white/95 text-[14px] font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-[1.3] line-clamp-2 font-normal pr-2">
                       {caption}
                    </p>
                  </div>
                )}
                {hashtags && (
                  <div className="mt-1.5 pointer-events-auto flex flex-wrap gap-1">
                    {hashtags.split(',').slice(0,3).map((tag, i) => (
                      <span key={i} className="text-[#ef2950] font-semibold text-[13px] drop-shadow-md shadow-black font-sans">{tag.trim().startsWith('#') ? tag.trim() : '#' + tag.trim()}</span>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2 mt-4 pointer-events-auto">
                  <div className="group flex items-center bg-[#0c0c0e]/45 backdrop-blur-md rounded-xl p-1.5 pr-4 w-fit border border-white/10 shadow-md text-left">
                    <div className="size-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center mr-3 border border-white/5 bg-zinc-900">
                       {mainProductPreview ? <img src={mainProductPreview} alt="Product" className="size-full object-cover" /> : <ShoppingBag className="size-5 text-white/50" />}
                    </div>
                    <div className="flex flex-col items-start justify-center max-w-[170px]">
                       <span className="text-[13px] font-sans font-semibold text-white/95 leading-tight truncate w-full">
                         {productName || "Product Name"}
                       </span>
                       <span className="text-[12px] font-sans text-rose-450 font-bold mt-0.5">
                         {productPrice ? `₹${parseFloat(productPrice).toLocaleString('en-IN')}` : "Price"}
                       </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side Icons */}
              <div className="absolute bottom-[80px] right-2 w-14 flex flex-col items-center gap-y-5 z-20 pointer-events-auto pb-safe">
                <div className="relative mb-2">
                  <div className="size-[48px] rounded-full border-[1.5px] border-white/80 bg-zinc-800 overflow-hidden shrink-0 shadow-sm flex flex-col justify-center items-center">
                     <span className="text-white text-xl font-bold">{user?.user_metadata?.username ? user.user_metadata.username.charAt(0).toUpperCase() : 'U'}</span>
                  </div>
                  <button title="Follow" className="absolute -bottom-2 left-1/2 -translate-x-1/2 size-6 rounded-full bg-[#ef2950] text-white flex items-center justify-center shadow-md border-[2px] border-black transition-transform active:scale-95 z-20">
                     <Plus className="size-4" strokeWidth={3} />
                  </button>
                </div>
                <div className="flex flex-col items-center group">
                  <Heart className="size-9 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                  <span className="text-white font-sans text-[13px] font-semibold drop-shadow-md">0</span>
                </div>
                <div className="flex flex-col items-center group mt-1">
                  <Bookmark className="size-9 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                  <span className="text-white font-sans text-[13px] font-semibold drop-shadow-md">0</span>
                </div>
                <div className="flex flex-col items-center group mt-1">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="white" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                     <path d="M21 12l-7-7v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19l7-7z"/>
                  </svg>
                  <span className="text-white font-sans text-[13px] font-semibold drop-shadow-md">0</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


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
