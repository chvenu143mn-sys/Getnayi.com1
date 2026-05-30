import React, { useState } from 'react';
import { PlaySquare, Search, Filter, Trash2, Eye, ShieldCheck, CheckCircle, XCircle, Tag, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminVideosProps {
  videos: any[];
  categories: any[];
  handleDeleteVideo: (id: string) => Promise<void>;
  handleVerifyProduct: (id: string, isVerified: boolean) => Promise<void>;
  handleUpdateVideoCategory: (id: string, catId: string) => Promise<void>;
  handleViewVideo: (video: any) => void;
  isRefreshing: boolean;
}

export default function AdminVideos({
  videos,
  categories,
  handleDeleteVideo,
  handleVerifyProduct,
  handleUpdateVideoCategory,
  handleViewVideo,
  isRefreshing,
}: AdminVideosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending_review' | 'rejected'>('all');

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
            <option value="rejected">Rejected / Restricted</option>
          </select>
        </div>

        <div className="flex items-center justify-end">
          <span className="text-zinc-500 text-xs font-mono">
            {filtered.length} of {videos.length} indices loaded
          </span>
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
                      "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                      {v.status === 'active' ? 'Approved' : v.status === 'pending_review' ? 'Pending' : 'Rejected'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right font-mono flex justify-end gap-1 px-5 mt-4">
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
