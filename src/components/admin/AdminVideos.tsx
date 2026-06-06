import React, { useState } from 'react';
import { PlaySquare, Search, Filter, Trash2, Eye, ShieldCheck, CheckCircle, XCircle, Tag, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface AdminVideosProps {
  videos: any[];
  categories: any[];
  handleDeleteVideo: (id: string) => Promise<void>;
  handleVerifyProduct: (id: string, isVerified: boolean) => Promise<void>;
  handleUpdateVideoCategory: (id: string, catId: string) => Promise<void>;
  handleUpdateVideoStatus?: (id: string, status: string, reason?: string) => Promise<void>;
  handleViewVideo: (video: any) => void;
  isRefreshing: boolean;
}

export default function AdminVideos({
  videos,
  categories,
  handleDeleteVideo,
  handleVerifyProduct,
  handleUpdateVideoCategory,
  handleUpdateVideoStatus,
  handleViewVideo,
  isRefreshing,
}: AdminVideosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending_review' | 'rejected' | 'processing'>('all');
  const [isRetagging, setIsRetagging] = useState(false);
  const [retagProgress, setRetagProgress] = useState(0);
  const [retaggingTargetId, setRetaggingTargetId] = useState<string | null>(null);

  const handleAutoTag = async (video: any, isBulk = false) => {
    try {
      if (!isBulk) setRetaggingTargetId(video.id);
      
      const prompt = `You are an AI assistant categorizing short videos.
Available Categories:
${categories.map(c => c.name).join(', ')}

Video Details:
Caption: "${video.caption || ''}"
URL: ${video.product_url || 'None'}

Please choose the BEST single category from the list above for this video. If none fit well, output "Unassigned".
Respond ONLY with the exact category name as a plain string, nothing else.`;

      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      
      const res = await fetch('/api/admin-auto-tag', {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
      });
      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error('Invalid server response');
      }
      if (!res.ok) throw new Error(data?.error || 'Server error');
      
      let catName: any = '';
      if (data.is_fallback) {
         // @ts-ignore
         const aiResponse = await window.puter.ai.chat(prompt);
         catName = aiResponse?.message?.content || aiResponse?.text || aiResponse || '';
         if (typeof catName !== 'string') {
            catName = typeof catName.toString === 'function' ? catName.toString() : JSON.stringify(catName);
         }
      } else {
         catName = data.text;
      }
      
      if (typeof catName === 'string') {
         catName = catName.trim().replace(/["']/g, ''); // cleanup
         if (catName !== 'Unassigned') {
            const matched = categories.find(c => c.name.toLowerCase() === catName?.toLowerCase());
            if (matched) {
               await handleUpdateVideoCategory(video.id, matched.id);
               if (!isBulk) alert(`Auto-tagged as: ${matched.name}`);
            } else if (!isBulk) {
               alert(`AI suggested "${catName}" but it doesn't strictly match existing categories.`);
            }
         } else if (!isBulk) {
            alert('AI could not confidently assign a category.');
         }
      }
    } catch (e: any) {
      console.error(e);
      if (!isBulk) alert('Auto-tagging failed: ' + e.message);
    } finally {
      if (!isBulk) setRetaggingTargetId(null);
    }
  };

  const handleBulkRetag = async () => {
    const unassigned = videos.filter(v => !v.category_id);
    if (!unassigned.length) return alert('No unassigned videos found.');
    if (!window.confirm(`Auto-tag ${unassigned.length} unassigned videos using AI in the background?`)) return;

    setIsRetagging(true);
    let done = 0;
    
    for (const v of unassigned) {
       await handleAutoTag(v, true);
       done++;
       setRetagProgress(Math.floor((done / unassigned.length) * 100));
    }
    
    setIsRetagging(false);
    setRetagProgress(0);
    alert('Background backfilling complete!');
  };

  const filtered = videos.filter(v => {
    const matchesSearch = 
      (v.caption || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.profiles?.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="gap-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Catalogs & Video Archives</h1>
        <p className="text-zinc-500 text-xs mt-1">Audit, edit metadata, adjust safety ratings, and purge video streams.</p>
      </div>

      {/* Control Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by caption, creator username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#141416]/90 border border-white/5 focus:border-white/15 focus:ring-1 focus:ring-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-zinc-500" />
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#141416]/90 border border-white/5 focus:border-white/15 rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-800"
          >
            <option value="all">All Content States</option>
            <option value="active">Approved / Active Only</option>
            <option value="pending_review">Pending Review</option>
            <option value="processing">Processing Encoding</option>
            <option value="rejected">Rejected / Restricted</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-4">
          <span className="text-zinc-500 text-xs font-mono">
            {filtered.length} of {videos.length} indices loaded
          </span>
          <button type="button"
            onClick={handleBulkRetag}
            disabled={isRetagging}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#4F46E5]/10 text-[#4F46E5] hover:bg-[#4F46E5]/20 border border-[#4F46E5]/20 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {isRetagging ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {isRetagging ? `Retagging (${retagProgress}%)` : 'AI Bulk Retag'}
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181a] border-b border-white/5 text-zinc-500 uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-4 px-5 font-semibold">Media Metadata</th>
                <th className="py-4 px-5 font-semibold">Creator</th>
                <th className="py-4 px-5 font-semibold">Classification Category</th>
                <th className="py-4 px-5 font-semibold">Affiliated Link</th>
                <th className="py-4 px-5 font-semibold">Status Badge</th>
                <th className="py-4 px-5 font-semibold text-right">Moderator actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-medium">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.01] transition-all">
                  <td className="py-4 px-5 flex items-center gap-3">
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} className="w-12 h-16 rounded-lg object-cover bg-neutral-900 border border-white/5" referrerPolicy="no-referrer"  alt="" />
                    ) : (
                      <div className="w-12 h-16 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-zinc-500 font-mono text-[9px]">NO IMG</div>
                    )}
                    <div className="min-w-0 flex flex-col justify-center">
                      <span className="text-white font-semibold text-[13px] truncate max-w-[200px]" title={v.caption}>
                        {v.caption || 'Untitled Video'}
                      </span>
                      <span className="text-zinc-500 font-mono text-[10px] mt-1 flex items-center gap-2">
                        <span>views: {v.views || 0}</span>
                        <span>•</span>
                        <span>trust: {v.trust_score || 100}%</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      {v.profiles?.avatar_url ? (
                        <img src={v.profiles.avatar_url} className="size-6 rounded-full object-cover border border-white/15" referrerPolicy="no-referrer"  alt="" />
                      ) : (
                        <div className="size-6 rounded-full bg-white/10" />
                      )}
                      <span className="text-zinc-33">@{v.profiles?.username || 'user'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <Tag className="size-3.5 text-zinc-500 shrink-0" />
                      <select
                        value={v.category_id || ''}
                        onChange={(e) => handleUpdateVideoCategory(v.id, e.target.value)}
                        className="bg-[#0c0c0e]/45 border border-white/5 text-zinc-300 px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-white/10"
                      >
                        <option value="">Unassigned</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button type="button"
                        onClick={() => handleAutoTag(v)}
                        disabled={retaggingTargetId === v.id}
                        className="p-1.5 bg-[#4F46E5]/10 text-[#4F46E5] hover:bg-[#4F46E5]/20 text-xs rounded-lg transition-all"
                        title="AI Auto-tag"
                      >
                        {retaggingTargetId === v.id ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    {v.product_url ? (
                      <div className="flex flex-col gap-1 max-w-[150px]">
                        <a 
                          href={v.product_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[#F97316] hover:underline flex items-center gap-1 text-[11px] font-semibold truncate"
                        >
                          Link <ExternalLink className="size-3" />
                        </a>
                        <button type="button" aria-label="button" 
                          onClick={() => handleVerifyProduct(v.id, !v.is_admin_verified_link)}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold border text-left w-fit max-w-full truncate",
                            v.is_admin_verified_link 
                              ? "bg-green-500/10 border-green-500/25 text-green-500" 
                              : "bg-zinc-500/10 border-white/5 text-zinc-500 hover:text-white"
                          )}
                        >
                          {v.is_admin_verified_link ? '✓ Verified link' : 'Verify Link'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-650 italic text-[11px]">No link affiliate</span>
                    )}
                  </td>
                  <td className="py-4 px-5">
                      <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold border font-mono",
                      v.status === 'active' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                      v.status === 'pending_review' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                      v.status === 'processing' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                      "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                      {v.status === 'active' ? 'Approved' : 
                       v.status === 'pending_review' ? 'Pending Rev' : 
                       v.status === 'processing' ? 'Encoding' : 
                       'Rejected'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right font-mono flex items-center justify-end gap-1 px-5 mt-4">
                    {handleUpdateVideoStatus && v.status === 'pending_review' && (
                      <>
                        <button type="button" aria-label="button" 
                          onClick={() => handleUpdateVideoStatus(v.id, 'active')}
                          className="p-1.5 bg-[#0c0c0e]/45 border border-white/5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition"
                          title="Approve to Feed"
                        >
                          <CheckCircle className="size-3.5" />
                        </button>
                        <button type="button" aria-label="button" 
                          onClick={() => {
                            const reason = window.prompt("Enter reason for rejection:");
                            if (reason !== null) {
                              if (!reason.trim()) {
                                alert("Rejection reason is required.");
                                return;
                              }
                              handleUpdateVideoStatus(v.id, 'rejected', reason.trim());
                            }
                          }}
                          className="p-1.5 bg-[#0c0c0e]/45 border border-white/5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                          title="Reject Video"
                        >
                          <XCircle className="size-3.5" />
                        </button>
                      </>
                    )}
                    <button type="button" aria-label="button" 
                      onClick={() => handleViewVideo(v)}
                      className="p-1.5 bg-[#0c0c0e]/45 border border-white/5 rounded-lg text-zinc-400 hover:text-white transition"
                      title="Inspect Video Player"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    <button type="button" aria-label="button" 
                      onClick={() => handleDeleteVideo(v.id)}
                      className="p-1.5 bg-[#0c0c0e]/45 border border-white/5 rounded-lg text-zinc-400 hover:text-[#EF4444] transition"
                      title="Delete / Purge Stream"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 bg-[#121214]">
                    No videos match search queries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
