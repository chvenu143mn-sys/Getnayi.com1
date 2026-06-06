import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CreatorApplication, Profile, Video } from '../types';
import { ShieldAlert, Loader2, Check, X, ExternalLink, Users, AlertTriangle, PlaySquare, TrendingUp, Search, Trash2, Ban, Briefcase, Edit2, Save, GripVertical, FileText, ShieldCheck, Link2, BarChart2, Settings, Layers, Home, Eye, CheckCircle, XCircle, MoreVertical, RefreshCw, ImagePlus, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';

// Modular Admin sub-components import
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminVideos from '../components/admin/AdminVideos';
import AdminCreators from '../components/admin/AdminCreators';
import AdminReports from '../components/admin/AdminReports';
import AdminProductLinks from '../components/admin/AdminProductLinks';
import AdminSpam from '../components/admin/AdminSpam';
import AdminAnalytics from '../components/admin/AdminAnalytics';
import AdminSettings from '../components/admin/AdminSettings';
import AdminAuditLogs from '../components/admin/AdminAuditLogs';
import AdminSearchInfra from '../components/admin/AdminSearchInfra';
import AdminModeration from '../components/admin/AdminModeration';

const handleViewVideo = (video: any) => {
    if (!video) return;
    if (video.video_url) {
      window.open(video.video_url, '_blank');
  } else {
      alert(`Viewing video context: "${video.caption || 'No caption'}" (ID: ${video.id})`);
  }
};


const COLORS = ['#F97316', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6'];

const SIDEBAR_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'videos', label: 'Videos', icon: PlaySquare },
    { id: 'flagged', label: 'Flagged Videos', icon: ShieldAlert },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'creators', label: 'Creators', icon: Users },
    { id: 'verification', label: 'Verification Requests', icon: ShieldCheck },
    { id: 'links', label: 'Product Links', icon: Link2 },
    { id: 'spam', label: 'Spam Detection', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'audit_logs', label: 'Audit Trail Logs', icon: FileText },
    { id: 'search_infra', label: 'Search Optimization', icon: Search },
  ];

async function fetchWithAdminAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  return fetch(url, { credentials: 'include', ...options, headers });
}

type Tab = 'dashboard' | 'videos' | 'flagged' | 'reports' | 'creators' | 'verification' | 'links' | 'spam' | 'analytics' | 'settings' | 'categories' | 'audit_logs' | 'search_infra';

interface AdminReport {
  id: string;
  video_id: string;
  user_id: string;
  reason: string;
  created_at: string;
  videos: Video;
  profiles: Profile;
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data states
  const [applications, setApplications] = useState<(CreatorApplication & { profiles: Profile })[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [creators, setCreators] = useState<Profile[]>([]);
  const [brands, setBrands] = useState<Profile[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string, created_at: string, videoCount?: number}[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryImageUrl, setEditingCategoryImageUrl] = useState('');
  const [isUploadingCategoryImage, setIsUploadingCategoryImage] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Custom states for newly supported tables
  const [products, setProducts] = useState<any[]>([]);
  const [spamItems, setSpamItems] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    require_verification_to_upload: false,
    allowed_product_domains: [],
    blacklisted_product_domains: [],
    max_upload_size_mb: 100,
    automatic_spam_filtering: true,
    maintenance_mode: false,
    support_email: 'chvenu143mn@gmail.com'
  });

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVideos: 0,
    totalReports: 0,
    pendingApps: 0
  });

  // Authenticated server actions wrapper

  useEffect(() => {
    if (!user) return;

    async function initializeAdmin() {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
        
      setIsAdmin(!!profile?.is_admin);
      if (profile?.is_admin) {
        await Promise.all([
          fetchApplications(),
          fetchReports(),
          fetchCreators(),
          fetchCategories(),
          fetchAllVideos(),
          fetchStats(),
          fetchProducts(),
          fetchSpamItems(),
          fetchSettingsDetail(),
          fetchAuditLogs()
        ]);
      }
      setLoading(false);
    }
    
    initializeAdmin();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    
    // Subscribe to new reports
    const reportsChannel = supabase.channel('admin-reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports();
        fetchStats();
      })
      .subscribe();

    // Subscribe to creator application changes
    const appsChannel = supabase.channel('admin-applications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creator_applications' }, () => {
        fetchApplications();
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(appsChannel);
    };
  }, [isAdmin]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchApplications(),
      fetchReports(),
      fetchCreators(),
      fetchCategories(),
      fetchAllVideos(),
      fetchStats(),
      fetchProducts(),
      fetchSpamItems(),
      fetchSettingsDetail(),
      fetchAuditLogs()
    ]);
    setTimeout(() => setIsRefreshing(false), 500); // slight delay for visual feedback
  };

  async function fetchCategories() {
    try {
      const { data } = await supabase.from('categories').select('*, videos(count)').order('created_at', { ascending: true });
      if (data) {
        setCategories(data.map((cat: any) => ({
          ...cat,
          videoCount: cat.videos?.[0]?.count || 0
        })));
      }
    } catch(err) {}
  }

  async function fetchAllVideos() {
    try {
      const res = await fetchWithAdminAuth('/api/admin/videos');
      if (res.ok) {
        const json = await res.json();
        setVideos(json.data || []);
      }
    } catch(err) {} 
  }

  async function fetchStats() {
    try {
      const [usersRes, videosRes, reportsRes, appsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('videos').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }),
        supabase.from('creator_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalVideos: videosRes.count || 0,
        totalReports: reportsRes.count || 0,
        pendingApps: appsRes.count || 0
      });
    } catch(err) {
      console.error(err);
    }
  }

  async function fetchApplications() {
    try {
      const res = await fetchWithAdminAuth('/api/admin/applications');
      if (res.ok) {
        const json = await res.json();
        const pending = (json.data || []).filter((app: any) => app.status === 'pending');
        setApplications(pending);
      }
    } catch (err) {
      console.error("fetchApplications catch:", err);
    }
  }

  async function fetchReports() {
    try {
      const res = await fetchWithAdminAuth('/api/admin/reports');
      if (res.ok) {
        const json = await res.json();
        setReports(json.data || []);
      }
    } catch (err) {}
  }

  async function fetchCreators() {
    try {
      const res = await fetchWithAdminAuth('/api/admin/creators');
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        setCreators(list);
        setBrands(list.filter((x: any) => x.is_brand));
      }
    } catch (err) {}
  }

  async function fetchProducts() {
    try {
      const res = await fetchWithAdminAuth('/api/admin/products');
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data || []);
      }
    } catch (err) {}
  }

  async function fetchSpamItems() {
    try {
      const res = await fetchWithAdminAuth('/api/admin/spam');
      if (res.ok) {
        const json = await res.json();
        setSpamItems(json.data || []);
      }
    } catch (err) {}
  }

  async function fetchSettingsDetail() {
    try {
      const res = await fetchWithAdminAuth('/api/admin/settings');
      if (res.ok) {
        const json = await res.json();
        setSettings(json.data || {});
      }
    } catch (err) {}
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetchWithAdminAuth('/api/admin/audit-logs');
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.data || []);
      }
    } catch (err) {}
  }

  const handleUpdateAppStatus = async (appId: string, userId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetchWithAdminAuth(`/api/admin/applications/${appId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, userId })
      });
      if (!res.ok) throw new Error('Failed to update app status');
      handleRefresh();
    } catch (err: any) {
      alert('Error updating application: ' + err.message);
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      const res = await fetchWithAdminAuth(`/api/admin/reports/${reportId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to dismiss report');
      fetchReports();
      fetchStats();
      fetchAuditLogs();
    } catch(err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleReviewReport = async (reportId: string, status: string) => {
    try {
      const res = await fetchWithAdminAuth(`/api/admin/reports/${reportId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update report status');
      fetchReports();
      fetchAuditLogs();
    } catch(err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleRemoveVerifiedBadge = async (videoId: string) => {
    if (!window.confirm('Remove verified real badge from this product?')) return;
    try {
      await handleVerifyProduct(videoId, false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleVerifyProduct = async (videoId: string, isVerified: boolean) => {
    try {
      const res = await fetchWithAdminAuth(`/api/admin/videos/${videoId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_admin_verified_link: isVerified, trust_score: isVerified ? 100 : 70 })
      });
      if (!res.ok) throw new Error('Failed to apply verification states');
      alert(isVerified ? 'Product Link Verified ✓' : 'Product Link Unverified');
      fetchAllVideos();
      fetchProducts();
      fetchSpamItems();
      fetchAuditLogs();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleUpdateVideoCategory = async (videoId: string, categoryId: string) => {
    try {
      const res = await fetchWithAdminAuth(`/api/admin/videos/${videoId}`, {
        method: 'PUT',
        body: JSON.stringify({ category_id: categoryId })
      });
      if (!res.ok) throw new Error('Failed to set video category');
      fetchAllVideos();
      fetchAuditLogs();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleUpdateVideoStatus = async (videoId: string, status: string, reason?: string) => {
    try {
      const res = await fetchWithAdminAuth(`/api/admin/videos/${videoId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, reason })
      });
      if (!res.ok) throw new Error('Failed to update video status');
      fetchAllVideos();
      fetchAuditLogs();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleToggleUploadPrivilege = async (userId: string, canUpload: boolean) => {
    try {
      const res = await fetchWithAdminAuth(`/api/admin/creators/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ can_upload: canUpload })
      });
      if (!res.ok) throw new Error('Failed to set upload privileges');
      fetchCreators();
      fetchAuditLogs();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleToggleCreatorRole = async (userId: string, field: string, value: boolean) => {
    try {
      const res = await fetchWithAdminAuth(`/api/admin/creators/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: value })
      });
      if (!res.ok) throw new Error('Failed to configure user properties');
      fetchCreators();
      fetchAuditLogs();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleSuspendCreator = async (userId: string, isSuspended: boolean) => {
    const act = isSuspended ? 'Suspend' : 'Reactivate';
    if (!window.confirm(`Are you sure you want to ${act.toLowerCase()} this user account?`)) return;
    try {
      const res = await fetchWithAdminAuth(`/api/admin/creators/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_suspended: isSuspended })
      });
      if (!res.ok) throw new Error(`Failed to update suspension status`);
      alert(`User suspension updated: ${isSuspended ? 'SUSPENDED' : 'ACTIVE'}`);
      fetchCreators();
      fetchReports();
      fetchAllVideos();
      fetchStats();
      fetchAuditLogs();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('Are you sure you want to delete this video? This will erase database entries and Bunny stream file packages permanently.')) return;
    try {
      const res = await fetchWithAdminAuth(`/api/admin/videos/${videoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to purge video content');
      alert('Content took down successfully.');
      fetchReports();
      fetchAllVideos();
      fetchStats();
      fetchProducts();
      fetchSpamItems();
      fetchAuditLogs();
    } catch (err: any) {
      alert('Error deleting video: ' + err.message);
    }
  };

  const handleDismissSpam = async (videoId: string) => {
    try {
      const res = await fetchWithAdminAuth(`/api/admin/videos/${videoId}`, {
        method: 'PUT',
        body: JSON.stringify({ trust_score: 95 })
      });
      if (!res.ok) throw new Error('Failed to whitelist spam video');
      alert('Spam alert dismissed and trust index whitelisted.');
      fetchSpamItems();
      fetchAllVideos();
      fetchAuditLogs();
    } catch (err: any) {
      alert('Error Whitelisting: ' + err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAdminAuth('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Failed to preserve system configurations');
      alert('System variables synchronized successfully!');
      fetchSettingsDetail();
      fetchSpamItems();
      fetchAuditLogs();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };


  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const { error } = await supabase.from('categories').insert({ name: newCategoryName.trim() });
      if (error) throw error;
      setNewCategoryName('');
      fetchCategories();
    } catch (err: any) {
      alert("Failed to create category: " + err.message);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the category "${name}"?`)) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      fetchCategories();
      setSelectedCategories(prev => prev.filter(c => c !== id));
    } catch (err: any) {
      alert("Failed to delete category: " + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedCategories.length} categories?`)) return;
    try {
      const { error } = await supabase.from('categories').delete().in('id', selectedCategories);
      if (error) throw error;
      setSelectedCategories([]);
      fetchCategories();
    } catch(err: any) {
      alert("Failed to delete categories: " + err.message);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return;
    try {
      const { error } = await supabase.from('categories').update({ name: editingCategoryName.trim(), image_url: editingCategoryImageUrl.trim() || null }).eq('id', id);
      if (error) {
        if (error.code === '42501' || (error.message && error.message.includes('policy'))) {
          alert("Permission denied. Ensure you ran the updated database.sql policy in Supabase to allow category updates.");
        }
        throw error;
      }
      setEditingCategory(null);
      setEditingCategoryImageUrl('');
      fetchCategories();
    } catch (err: any) {
      if (err.message && !err.message.includes('policy')) {
        alert("Failed to update category: " + err.message);
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px movement before drag starts, allows scrolling on mobile
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleUploadCategoryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCategoryImage(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      const res = await fetchWithAdminAuth('/api/bunny/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, filename: file.name })
      });

      if (!res.ok) {
        throw new Error('Failed to upload image');
      }
      const data = await res.json();
      setEditingCategoryImageUrl(data.url);
    } catch (err: any) {
      alert("Error uploading image: " + err.message);
    } finally {
      setIsUploadingCategoryImage(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);

      const reordered = arrayMove(categories, oldIndex, newIndex);
      setCategories(reordered);

      const now = new Date();
      // To ensure no overlap with existing newly added items which might be created during this,
      // we just rewrite everyone's timestamp sequentially
      const updatePromises = reordered.map((cat, index) => {
        const itemDate = new Date(now.getTime() + index * 1000);
        return supabase
          .from('categories')
          .update({ created_at: itemDate.toISOString() })
          .eq('id', cat.id);
      });

      Promise.all(updatePromises).catch(err => {
         console.error('Failed to update sort order', err);
         alert('Failed to update category order.');
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-64px-env(safe-area-inset-bottom))] w-full bg-[#0c0c0e] text-white pt-safe flex flex-col font-sans relative">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col relative z-10">
          <div className="px-4 py-6 sticky top-0 z-10">
            <div className="flex justify-between items-center mb-6">
              <div className="w-40 h-8 bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
            <div className="flex gap-x-1 bg-white/5 p-1 rounded-2xl backdrop-blur-md">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-1 h-10 bg-white/10 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          <div className="p-4 gap-y-6">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white/5 p-5 rounded-3xl h-28 animate-pulse backdrop-blur-sm border border-white/5"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-[calc(100dvh-64px-env(safe-area-inset-bottom))] w-full bg-[#0c0c0e] text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 bg-red-500/10 blur-[100px] rounded-full" />
        <ShieldAlert className="size-16 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10" />
        <h2 className="text-3xl font-display font-bold mb-3 tracking-tight z-10">Access Denied</h2>
        <p className="text-zinc-400 mb-8 z-10">You don't have permission to view this command center.</p>
        <button type="button" aria-label="button"  onClick={() => navigate('/')} className="px-8 py-3.5 bg-white text-black rounded-xl font-bold tracking-wide active:scale-95 transition-transform z-10">
          Return Home
        </button>
      </div>
    );
  }


  const userGrowthData = [
    { name: 'May 1', users: 100000 },
    { name: 'May 8', users: 150000 },
    { name: 'May 15', users: 140000 },
    { name: 'May 22', users: 280000 },
    { name: 'May 29', users: stats.totalUsers > 380000 ? stats.totalUsers : 380000 },
  ];

  const topCategoriesData = categories.slice(0, 5).map(c => ({
    name: c.name,
    value: c.videoCount || 0
  }));
  const hasCategoryData = topCategoriesData.some(c => c.value > 0);
  const pieData = hasCategoryData ? topCategoriesData : [{name: 'None', value: 1}];

  return (
    <div className="flex h-screen bg-[#0E0E10] text-[#E0E0E0] font-sans overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#0c0c0e]/60 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#141416] border-r border-white/5 flex flex-col shrink-0 transition-transform duration-300 md:static md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="button"  onClick={() => navigate(-1)} className="p-1 -ml-2 text-zinc-400 hover:text-white transition-colors">
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div className="size-8 rounded-full bg-[#F97316] text-white flex items-center justify-center font-bold text-xl">G</div>
            <span className="font-bold text-white text-lg tracking-wide">Getnayi <span className="text-[#F97316] font-normal text-sm">Admin</span></span>
          </div>
          <button type="button" aria-label="button"  className="md:hidden p-1 text-zinc-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
          {SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button type="button" aria-label="button" 
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as Tab);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm text-left group",
                  isActive ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                )}
              >
                <div className="flex items-center gap-4">
                  <Icon className={cn("size-5", isActive ? "text-white" : "text-zinc-500")} />
                  {item.label}
                </div>
                {item.id === 'flagged' && videos.filter(v => v.status === 'pending_review').length > 0 && (
                  <span className="bg-[#EF4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center animate-in zoom-in">
                    {videos.filter(v => v.status === 'pending_review').length}
                  </span>
                )}
                {item.id === 'verification' && applications.length > 0 && (
                  <span className="bg-[#EF4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center animate-in zoom-in">
                    {applications.length}
                  </span>
                )}
                {item.id === 'reports' && reports.length > 0 && (
                  <span className="bg-[#EF4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center animate-in zoom-in">
                    {reports.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col h-screen bg-[#0A0A0C] w-full relative overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden h-16 border-b border-white/5 flex items-center px-4 shrink-0 bg-[#141416] z-30 w-full relative">
          <button type="button" aria-label="button"  onClick={() => navigate(-1)} className="p-2 -ml-2 text-white/90 hover:text-white transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button type="button" aria-label="button"  
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 ml-2 text-zinc-400 hover:text-white"
          >
            <Menu className="size-6" />
          </button>
          <span className="font-bold text-white ml-2 text-lg capitalize">{activeTab}</span>
        </div>

        <div className="flex-1 overflow-y-auto w-full p-4 md:p-8">
          <div className="max-w-[1400px] w-full mx-auto gap-y-4 md:gap-y-6">
          
          {activeTab === 'dashboard' && (
            <AdminDashboard
              stats={stats}
              reports={reports}
              creators={creators}
              categories={categories}
              isRefreshing={isRefreshing}
              handleRefresh={handleRefresh}
              handleDismissReport={handleDismissReport}
              handleReviewReport={handleReviewReport}
              handleViewVideo={handleViewVideo}
            />
          )}

          {activeTab === 'videos' && (
            <AdminVideos
              videos={videos}
              categories={categories}
              handleDeleteVideo={handleDeleteVideo}
              handleVerifyProduct={handleVerifyProduct}
              handleUpdateVideoCategory={handleUpdateVideoCategory}
              handleUpdateVideoStatus={handleUpdateVideoStatus}
              handleViewVideo={handleViewVideo}
              isRefreshing={isRefreshing}
            />
          )}

          {activeTab === 'flagged' && (
            <AdminModeration
              videos={videos}
              categories={categories}
              handleDeleteVideo={handleDeleteVideo}
              handleVerifyProduct={handleVerifyProduct}
              handleUpdateVideoCategory={handleUpdateVideoCategory}
              handleUpdateVideoStatus={handleUpdateVideoStatus}
              handleViewVideo={handleViewVideo}
              isRefreshing={isRefreshing}
            />
          )}

          {activeTab === 'reports' && (
            <AdminReports
              reports={reports}
              handleDismissReport={handleDismissReport}
              handleReviewReport={handleReviewReport}
              handleDeleteVideo={handleDeleteVideo}
              handleSuspendCreator={handleSuspendCreator}
              handleViewVideo={handleViewVideo}
            />
          )}

          {activeTab === 'creators' && (
            <AdminCreators
              creators={creators}
              handleToggleUploadPrivilege={handleToggleUploadPrivilege}
              handleToggleCreatorRole={handleToggleCreatorRole}
              handleSuspendCreator={handleSuspendCreator}
            />
          )}

          {activeTab === 'links' && (
            <AdminProductLinks
              products={products}
              handleVerifyProduct_direct={handleVerifyProduct}
              handleViewVideo={handleViewVideo}
            />
          )}

          {activeTab === 'spam' && (
            <AdminSpam
              spamItems={spamItems}
              handleDeleteVideo={handleDeleteVideo}
              handleSuspendCreator={handleSuspendCreator}
              handleViewVideo={handleViewVideo}
              handleDismissSpam={handleDismissSpam}
            />
          )}

          {activeTab === 'analytics' && (
            <AdminAnalytics
              stats={stats}
              categories={categories}
              creators={creators}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettings
              settings={settings}
              setSettings={setSettings}
              handleSaveSettings={handleSaveSettings}
            />
          )}

          {activeTab === 'audit_logs' && (
            <AdminAuditLogs
              auditLogs={auditLogs}
            />
          )}

          {activeTab === 'search_infra' && (
            <AdminSearchInfra />
          )}

          {(activeTab as any) === 'dashboard_old_hidden' && (
            <div className="gap-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
                <button type="button" aria-label="button" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-xl text-sm font-medium transition-all"
                >
                  <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Syncing..." : "Sync / Refresh"}
                </button>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                 <div className="bg-[#161619] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                    <div className="text-zinc-400 text-sm mb-2">Total Users</div>
                    <div className="flex items-end justify-between">
                       <span className="text-2xl font-bold text-white">{stats.totalUsers > 1000000 ? (stats.totalUsers/1000000).toFixed(1)+'M' : stats.totalUsers.toLocaleString()}</span>
                       <div className="flex flex-col items-end">
                          <TrendingUp className="size-5 text-zinc-500 mb-1" />
                          <span className="text-[#10B981] text-xs font-semibold flex items-center gap-1">↑ 12.3%</span>
                       </div>
                    </div>
                 </div>
                 <div className="bg-[#161619] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                    <div className="text-zinc-400 text-sm mb-2 flex items-center justify-between">
                      <span>Total Creators</span>
                      <Users className="size-4 text-zinc-500" />
                    </div>
                    <div className="flex items-end justify-between">
                       <span className="text-2xl font-bold text-white">{(creators.length > 1000 ? (creators.length/1000).toFixed(1)+'K' : creators.length.toLocaleString())}</span>
                       <span className="text-[#10B981] text-xs font-semibold flex items-center gap-1">↑ 8.3%</span>
                    </div>
                 </div>
                 <div className="bg-[#161619] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                    <div className="text-zinc-400 text-sm mb-2 flex items-center justify-between">
                      <span>Total Videos</span>
                      <PlaySquare className="size-4 text-zinc-500" />
                    </div>
                    <div className="flex items-end justify-between">
                       <span className="text-2xl font-bold text-white">{(stats.totalVideos > 1000 ? (stats.totalVideos/1000).toFixed(1)+'K' : stats.totalVideos.toLocaleString())}</span>
                       <span className="text-[#10B981] text-xs font-semibold flex items-center gap-1">↑ 15.3%</span>
                    </div>
                 </div>
                 <div className="bg-[#161619] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                    <div className="text-zinc-400 text-sm mb-2 flex items-center justify-between">
                      <span>Reports Today</span>
                      <FileText className="size-4 text-zinc-500" />
                    </div>
                    <div className="flex items-end justify-between">
                       <span className="text-2xl font-bold text-white">{stats.totalReports.toLocaleString()}</span>
                       <span className="text-[#EF4444] text-xs font-semibold flex items-center gap-1">↓ 6.4%</span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                 <div className="bg-[#161619] border border-white/5 rounded-2xl p-5">
                    <h3 className="text-zinc-400 text-sm font-medium mb-4">User Growth</h3>
                    <div className="h-[200px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                           <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                           <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                           <Line type="monotone" dataKey="users" stroke="#F97316" strokeWidth={3} dot={{ fill: '#F97316', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                         </LineChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
                 
                 <div className="bg-[#161619] border border-white/5 rounded-2xl p-5 flex flex-row items-center justify-between">
                    <div className="w-1/2 flex flex-col justify-start h-full">
                       <h3 className="text-zinc-400 text-sm font-medium mb-4">Top Categories</h3>
                       <div className="flex flex-col gap-2">
                          {hasCategoryData ? topCategoriesData.map((cat, i) => (
                            <div key={cat.name} className="flex items-center justify-between text-xs">
                               <span className="text-zinc-300">{cat.name}</span>
                               <span className="text-zinc-500">{Math.round((cat.value / (stats.totalVideos || 1)) * 100)}%</span>
                            </div>
                          )) : (
                            <div className="text-zinc-500 text-xs">No data available</div>
                          )}
                       </div>
                    </div>
                    <div className="h-[150px] w-1/2 relative">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={pieData}
                             cx="50%"
                             cy="50%"
                             innerRadius={45}
                             outerRadius={65}
                             paddingAngle={5}
                             dataKey="value"
                             stroke="none"
                           >
                             {pieData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                           </Pie>
                         </PieChart>
                       </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="bg-[#161619] border border-white/5 rounded-2xl p-5">
                    <h3 className="text-zinc-400 text-sm font-medium mb-4">Recent Reports</h3>
                    <div className="flex flex-col gap-4">
                       {reports.slice(0, 5).map((r, i) => (
                         <div key={r.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className="size-4 rounded-full flex items-center justify-center border-2 border-[#161619] ring-2 ring-[#EF4444]" />
                               <span className="text-white text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{r.reason || 'Report'}</span>
                            </div>
                            <div className="flex items-center justify-between w-1/2 text-xs">
                               <span className="text-zinc-500 truncate">by {r.profiles?.username || 'user'}</span>
                               <span className="text-zinc-600">
                                 {Math.floor((new Date().getTime() - new Date(r.created_at).getTime()) / 60000)}m ago
                               </span>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="bg-[#161619] border border-[#F97316]/20 rounded-2xl overflow-hidden mt-8 shadow-[0_0_20px_rgba(249,115,22,0.05)]">
                 <div className="p-5 border-b border-white/5">
                    <h2 className="text-[#E0E0E0] text-sm font-bold tracking-widest uppercase">17. Moderation - Reports</h2>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead className="bg-[#131316]">
                          <tr className="border-b border-white/5 text-zinc-500">
                             <th className="py-4 px-5 font-medium">Report</th>
                             <th className="py-4 px-5 font-medium">Type</th>
                             <th className="py-4 px-5 font-medium">Reported By</th>
                             <th className="py-4 px-5 font-medium">Status</th>
                             <th className="py-4 px-5 font-medium text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {reports.slice(0, 10).map((r) => (
                             <tr key={r.id} className="hover:bg-white/[0.02] group">
                                <td className="py-4 px-5 text-white">{r.reason || 'Unknown'}</td>
                                <td className="py-4 px-5 text-[#F97316]">{r.reason}</td>
                                <td className="py-4 px-5 text-zinc-400">{r.profiles?.username || 'user'}</td>
                                <td className="py-4 px-5">
                                   <span className={cn(
                                      "px-3 py-1 rounded-full text-xs font-semibold border",
                                      (r as any).status === 'pending' ? "border-[#F97316]/50 text-[#F97316]" : 
                                      (r as any).status === 'reviewed' ? "border-[#F59E0B]/50 text-[#F59E0B]" :
                                      "border-[#10B981]/50 text-[#10B981]"
                                   )}>
                                      {(r as any).status === 'pending' ? 'New' : (r as any).status === 'reviewed' ? 'In Review' : 'Resolved'}
                                   </span>
                                </td>
                                <td className="py-4 px-5 text-right flex justify-end gap-2">
                                   <button type="button" aria-label="button"  className="size-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10"><Eye className="size-4 text-zinc-400"/></button>
                                   <button type="button" aria-label="button"  className="size-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10"><CheckCircle className="size-4 text-zinc-400"/></button>
                                </td>
                             </tr>
                          ))}
                          {reports.length === 0 && (
                             <tr><td colSpan={5} className="py-12 text-center text-zinc-500">No reports found</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}

          {(activeTab as any) === 'videos_old_hidden' && (
             <div className="gap-y-6 animate-in fade-in duration-500">
               <div className="bg-[#161619] border border-[#F97316]/20 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(249,115,22,0.05)]">
                 <div className="p-5 border-b border-white/5">
                    <h2 className="text-[#E0E0E0] text-sm font-bold tracking-widest uppercase">16. Moderation - Videos</h2>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead className="bg-[#131316]">
                          <tr className="border-b border-white/5 text-zinc-500">
                             <th className="py-4 px-5 font-medium">Video</th>
                             <th className="py-4 px-5 font-medium">Creator</th>
                             <th className="py-4 px-5 font-medium">Status</th>
                             <th className="py-4 px-5 font-medium">Views</th>
                             <th className="py-4 px-5 font-medium text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {videos.map((v) => (
                             <tr key={v.id} className="hover:bg-white/[0.02] group">
                                <td className="py-4 px-5 flex items-center gap-3 text-white">
                                   {v.thumbnail_url ? (
                                      <img src={v.thumbnail_url} className="size-10 rounded-md object-cover"  alt="" />
                                   ) : (
                                      <div className="size-10 rounded-md bg-white/10" />
                                   )}
                                   <span className="truncate max-w-[200px]">{v.caption || 'Untitled Video'}</span>
                                </td>
                                <td className="py-4 px-5">
                                   <div className="flex items-center gap-2">
                                     {v.profiles?.avatar_url ? (
                                        <img src={v.profiles.avatar_url} className="size-6 rounded-full object-cover"  alt="" />
                                     ) : (
                                        <div className="size-6 rounded-full bg-white/10" />
                                     )}
                                     <span className="text-zinc-300">{v.profiles?.username || 'Unknown'}</span>
                                   </div>
                                </td>
                                <td className="py-4 px-5">
                                   <span className={cn("font-medium", v.status === 'active' ? "text-[#10B981]" : v.status === 'pending' ? "text-[#F59E0B]" : "text-[#EF4444]")}>
                                      {v.status === 'active' ? 'Approved' : v.status === 'pending' ? 'Pending' : 'Review'}
                                   </span>
                                </td>
                                <td className="py-4 px-5 text-zinc-400">{(v.views || 0).toLocaleString()}</td>
                                <td className="py-4 px-5 text-right flex justify-end gap-2">
                                   <button type="button" aria-label="button"  className="size-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 bg-[#0c0c0e]/20"><Eye className="size-4 text-zinc-400"/></button>
                                   <button type="button" aria-label="button"  className="size-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 bg-[#0c0c0e]/20"><CheckCircle className="size-4 text-zinc-400"/></button>
                                   <button type="button" aria-label="button"  className="size-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 bg-[#0c0c0e]/20"><XCircle className="size-4 text-zinc-400"/></button>
                                </td>
                             </tr>
                          ))}
                          {videos.length === 0 && (
                             <tr><td colSpan={5} className="py-12 text-center text-zinc-500">No videos found</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
               </div>
             </div>
          )}

          {(activeTab as any) === 'verification_old_hidden' && (
             <div className="gap-y-6 animate-in fade-in duration-500">
               <div className="bg-[#161619] border border-[#F97316]/20 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(249,115,22,0.05)]">
                 <div className="p-5 border-b border-white/5">
                    <h2 className="text-[#E0E0E0] text-sm font-bold tracking-widest uppercase">18. Verification Requests</h2>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead className="bg-[#131316]">
                          <tr className="border-b border-white/5 text-zinc-500">
                             <th className="py-4 px-5 font-medium">Creator</th>
                             <th className="py-4 px-5 font-medium">Followers</th>
                             <th className="py-4 px-5 font-medium">Status</th>
                             <th className="py-4 px-5 font-medium text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {applications.map((app) => (
                             <tr key={app.id} className="hover:bg-white/[0.02] group">
                                <td className="py-4 px-5 flex items-center gap-3 text-white">
                                   {app.profiles?.avatar_url ? (
                                      <img src={app.profiles.avatar_url} className="size-10 rounded-full object-cover"  alt="" />
                                   ) : (
                                      <div className="size-10 rounded-full bg-white/10" />
                                   )}
                                   <span className="font-medium">{app.profiles?.username || 'Unknown'}</span>
                                </td>
                                <td className="py-4 px-5 text-zinc-400">128K</td>
                                <td className="py-4 px-5">
                                   <span className={cn(
                                      "px-4 py-1.5 rounded-xl border font-medium bg-[#0c0c0e]/40",
                                      app.status === 'pending' ? "border-[#F97316]/50 text-[#F97316]" :
                                      app.status === 'approved' ? "border-[#10B981]/50 text-[#10B981]" :
                                      "border-[#EF4444]/50 text-[#EF4444]"
                                   )}>
                                      {app.status === 'pending' ? 'Under Review' : app.status === 'approved' ? 'Approved' : 'Rejected'}
                                   </span>
                                </td>
                                <td className="py-4 px-5 text-right flex justify-end gap-2">
                                   <button type="button" aria-label="button"  className="size-8 rounded-lg border border-white/10 bg-[#0c0c0e]/20 flex items-center justify-center hover:bg-white/10"><Eye className="size-4 text-zinc-400"/></button>
                                   <button type="button" aria-label="button"  className="size-8 rounded-lg border border-white/10 bg-[#0c0c0e]/20 flex items-center justify-center hover:bg-white/10"><CheckCircle className="size-4 text-zinc-400"/></button>
                                </td>
                             </tr>
                          ))}
                          {applications.length === 0 && (
                             <tr><td colSpan={4} className="py-12 text-center text-zinc-500">No requests found</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'categories' && (() => {
            const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()));
            return (
            <div className="gap-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
              <div className="bg-[#161619] border border-[#F97316]/20 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(249,115,22,0.05)]">
                 <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-[16px] font-display">Manage Categories</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-white/10 text-white/80 py-1 px-3 rounded-full text-[12px] font-semibold">{filteredCategories.length} Categories</span>
                      {selectedCategories.length > 0 && (
                        <button type="button" aria-label="button" 
                          onClick={handleBulkDelete}
                          className="bg-red-500/20 text-red-500 hover:bg-red-500/30 py-1 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="size-3" />
                          Delete Selected ({selectedCategories.length})
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full sm:w-auto relative">
                     <Search className="size-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                     <input
                       type="text"
                       placeholder="Find category..."
                       value={categorySearchTerm}
                       onChange={(e) => setCategorySearchTerm(e.target.value)}
                       className="w-full sm:w-[250px] bg-[#0c0c0e]/40 text-white placeholder-zinc-500 rounded-xl pl-9 pr-4 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-blue-500 border border-white/5"
                     />
                  </div>
                 </div>
                 
                 <div className="p-5 border-b border-white/5 bg-[#131316]">
                    <form onSubmit={handleCreateCategory} className="flex gap-3">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="E.g., Skincare, Fragrance..."
                        className="flex-1 bg-[#0c0c0e]/40 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-blue-500 border border-white/5"
                      />
                      <button aria-label="button" 
                        type="submit"
                        disabled={!newCategoryName.trim()}
                        className="bg-[#F97316] hover:bg-[#F97316]/90 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-colors text-[14px]"
                      >
                        Add
                      </button>
                    </form>
                 </div>

                 {categories.length === 0 ? (
                  <div className="text-center py-16 text-zinc-500 flex flex-col items-center">
                    <Briefcase className="size-12 mb-3 opacity-20" />
                    <p className="font-display tracking-wide font-medium">No categories found.</p>
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div className="text-center py-16 text-zinc-500">
                    <p className="font-display tracking-wide font-medium">No matching categories.</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={filteredCategories} strategy={verticalListSortingStrategy}>
                      <div className="divide-y divide-white/5">
                        {filteredCategories.map(cat => (
                          <SortableCategoryItem
                            key={cat.id}
                            cat={cat}
                            editingCategory={editingCategory}
                            editingCategoryName={editingCategoryName}
                            setEditingCategory={setEditingCategory}
                            setEditingCategoryName={setEditingCategoryName}
                            editingCategoryImageUrl={editingCategoryImageUrl}
                            setEditingCategoryImageUrl={setEditingCategoryImageUrl}
                            isUploadingCategoryImage={isUploadingCategoryImage}
                            handleUploadCategoryImage={handleUploadCategoryImage}
                            handleUpdateCategory={handleUpdateCategory}
                            handleDeleteCategory={handleDeleteCategory}
                            isSelected={selectedCategories.includes(cat.id)}
                            onSelect={(id, selected) => {
                              setSelectedCategories(prev => selected ? [...prev, id] : prev.filter(c => c !== id))
                            }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
            );
          })()}


          </div>
        </div>
      </div>
    </div>
  );
}

function SortableCategoryItem({
  cat,
  editingCategory,
  editingCategoryName,
  setEditingCategory,
  setEditingCategoryName,
  editingCategoryImageUrl,
  setEditingCategoryImageUrl,
  isUploadingCategoryImage,
  handleUploadCategoryImage,
  handleUpdateCategory,
  handleDeleteCategory,
  isSelected,
  onSelect
}: {
  cat: any;
  editingCategory: string | null;
  editingCategoryName: string;
  setEditingCategory: (id: string | null) => void;
  setEditingCategoryName: (name: string) => void;
  editingCategoryImageUrl: string;
  setEditingCategoryImageUrl: (url: string) => void;
  isUploadingCategoryImage: boolean;
  handleUploadCategoryImage: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleUpdateCategory: (id: string) => void;
  handleDeleteCategory: (id: string, name: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-5 flex items-center justify-between group transition-all",
        isDragging ? "bg-[#2a2a2e] shadow-[0_0_20px_rgba(0,0,0,0.5)] ring-1 ring-[#4A63F3] rounded-lg relative z-50" : "hover:bg-white/[0.02]"
      )}
    >
      {editingCategory === cat.id ? (
        <div className="flex flex-col sm:flex-row flex-1 items-start sm:items-center gap-3 w-full">
          <input
            type="text"
            autoFocus
            value={editingCategoryName}
            onChange={(e) => setEditingCategoryName(e.target.value)}
            className="bg-[#0c0c0e]/40 text-white rounded-lg px-3 py-2 text-[14px] focus:outline-none border border-white/10 focus:border-blue-500 w-full sm:flex-1 sm:max-w-[200px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdateCategory(cat.id);
              if (e.key === 'Escape') setEditingCategory(null);
            }}
          />
          <div className="w-full sm:flex-1 sm:max-w-[250px] flex items-center gap-2">
            <input
              type="text"
              placeholder="Image URL"
              value={editingCategoryImageUrl}
              onChange={(e) => setEditingCategoryImageUrl(e.target.value)}
              className="bg-[#0c0c0e]/40 text-white rounded-lg px-3 py-2 text-[14px] focus:outline-none border border-white/10 focus:border-blue-500 w-full"
            />
            <label className="cursor-pointer p-2 text-zinc-400 hover:text-white rounded-lg transition-all h-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              {isUploadingCategoryImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              <input type="file" className="hidden" accept="image/*" onChange={handleUploadCategoryImage} disabled={isUploadingCategoryImage} />
            </label>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button type="button" aria-label="button" 
              onClick={() => handleUpdateCategory(cat.id)}
              className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-all"
            >
              <Save className="size-5" />
            </button>
            <button type="button" aria-label="button" 
              onClick={() => {
                setEditingCategory(null);
                setEditingCategoryImageUrl('');
              }}
              className="p-2 text-zinc-400 hover:text-white rounded-lg transition-all"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-3">
            {onSelect && (
              <input
                type="checkbox"
                checked={isSelected || false}
                onChange={(e) => onSelect(cat.id, e.target.checked)}
                className="size-4 rounded border-white/20 bg-[#0c0c0e]/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
            )}
            <button type="button" aria-label="button" 
              {...attributes}
              {...listeners}
              className="p-2 -ml-2 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-white transition-colors shrink-0"
              title="Drag to reorder"
            >
              <GripVertical className="size-4" />
            </button>
            {cat.image_url ? (
              <img src={cat.image_url} alt={cat.name} className="size-10 rounded-md object-cover border border-white/10 mx-1 shrink-0 bg-white/5" />
            ) : (
              <div className="size-10 rounded-md bg-white/5 border border-white/10 mx-1 shrink-0 flex items-center justify-center">
                <ImagePlus className="size-4 text-zinc-600" />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="font-bold text-white tracking-wide text-[15px]">{cat.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-zinc-500 font-mono">{cat.id.substring(0,8)}...</span>
                <span className="text-[11px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-medium">
                  {cat.videoCount || 0} usage{(cat.videoCount || 0) === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="button" 
              onClick={() => {
                setEditingCategory(cat.id);
                setEditingCategoryName(cat.name);
                setEditingCategoryImageUrl(cat.image_url || '');
              }}
              className="p-2 text-blue-400/50 hover:bg-blue-400/10 hover:text-blue-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Edit2 className="size-[18px]" />
            </button>
            <button type="button" aria-label="button" 
              onClick={() => handleDeleteCategory(cat.id, cat.name)}
              className="p-2 text-red-500/50 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="size-[18px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

