import React, { useState } from 'react';
import { FileText, Search, Filter, Trash2, Eye, ShieldCheck, CheckSquare, RefreshCw, CheckCircle, Ban, AlertOctagon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseVideoProduct } from '../../utils/videoUtils';

interface AdminReportsProps {
  reports: any[];
  handleDismissReport: (id: string) => Promise<void>;
  handleReviewReport: (id: string, status: string) => Promise<void>;
  handleDeleteVideo: (id: string) => Promise<void>;
  handleSuspendCreator: (id: string, isSuspended: boolean) => Promise<void>;
  handleViewVideo: (video: any) => void;
}

export default function AdminReports({
  reports,
  handleDismissReport,
  handleReviewReport,
  handleDeleteVideo,
  handleSuspendCreator,
  handleViewVideo,
}: AdminReportsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');

  const filtered = reports.filter(r => {
    const matchesSearch = 
      (r.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.profiles?.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.videos?.profiles?.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="gap-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Reports & Warning Logs</h1>
        <p className="text-text-secondary text-xs mt-1">Review allegations of violations, inspect affiliated links, or remove infringing items from distribution.</p>
      </div>

      {/* Controls bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search reports dynamically..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#141416]/90 border border-border-subtle focus:border-border-subtle focus:ring-1 focus:ring-white/10 rounded-xl text-sm text-text-primary placeholder-zinc-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-text-secondary" />
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#141416]/90 border border-border-subtle focus:border-border-subtle rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-zinc-800"
          >
            <option value="all">All Report Actions</option>
            <option value="pending">New Flags Only</option>
            <option value="reviewed">Under Investigation</option>
            <option value="resolved">Resolved Conflicts</option>
          </select>
        </div>

        <div className="flex items-center justify-end">
          <span className="text-text-secondary text-xs font-mono">
            Directing {filtered.length} reports
          </span>
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-[#141416] border border-border-subtle rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181a] border-b border-border-subtle text-text-secondary uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-4 px-5 font-semibold">Alleged Violation</th>
                <th className="py-4 px-5 font-semibold">Flagged Creator</th>
                <th className="py-4 px-5 font-semibold">Filed By</th>
                <th className="py-4 px-5 font-semibold">Affiliated Media</th>
                <th className="py-4 px-5 font-semibold">Queue State</th>
                <th className="py-4 px-5 font-semibold text-right">Moderator Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-medium">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.01] transition-all">
                  <td className="py-4 px-5">
                    <div className="flex flex-col justify-start">
                      <span className="font-semibold text-text-primary text-[13px]">{r.reason || 'Safety hazard / violation link'}</span>
                      <span className="text-[10px] text-text-secondary font-mono mt-0.5">{r.id.substring(0,8)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-zinc-33">@{r.videos?.profiles?.username || 'uploader'}</span>
                  </td>
                  <td className="py-4 px-5 text-zinc-550">
                    <span>@{r.profiles?.username || 'user'}</span>
                  </td>
                  <td className="py-4 px-5">
                    {r.videos ? (
                      <button type="button" aria-label="button" 
                        onClick={() => handleViewVideo(r.videos)}
                        className="flex items-center gap-2 hover:underline text-text-secondary hover:text-text-primary text-left font-serif"
                      >
                        {r.videos.thumbnail_url ? (
                          <img src={r.videos.thumbnail_url} className="w-8 h-10 rounded-md object-cover bg-neutral-900 border border-border-subtle" referrerPolicy="no-referrer"  alt="" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-8 h-10 rounded bg-white/5" />
                        )}
                        <span className="max-w-[120px] truncate block text-[11px]">{parseVideoProduct(r.videos.caption).captionText || 'Inspect Asset'}</span>
                      </button>
                    ) : (
                      <span className="text-zinc-650 italic text-[11px]">Infringing media purged</span>
                    )}
                  </td>
                  <td className="py-4 px-5">
                    <select
                      value={r.status || 'pending'}
                      onChange={(e) => handleReviewReport(r.id, e.target.value)}
                      className={cn(
                        "font-mono px-2 py-1 rounded text-[10px] font-bold border bg-bg-base/45 focus:outline-none",
                        (r.status === 'pending' || !r.status) ? "border-red-500/25 text-red-500" :
                        r.status === 'reviewed' ? "border-yellow-500/25 text-yellow-500" :
                        "border-green-500/25 text-green-500"
                      )}
                    >
                      <option value="pending">PENDING</option>
                      <option value="reviewed">IN INVESTIGATION</option>
                      <option value="resolved">RESOLVED</option>
                    </select>
                  </td>
                  <td className="py-4 px-5 text-right font-mono flex justify-end gap-1.5 px-5 mt-2">
                    <button type="button" aria-label="button" 
                      onClick={() => handleDismissReport(r.id)}
                      className="p-1.5 bg-bg-base/45 border border-border-subtle rounded-lg text-text-secondary hover:text-green-500 transition"
                      title="Dismiss Report"
                    >
                      <ShieldCheck className="size-3.5" />
                    </button>
                    {r.videos && (
                      <button type="button" aria-label="button" 
                        onClick={() => handleDeleteVideo(r.videos.id)}
                        className="p-1.5 bg-bg-base/45 border border-border-subtle rounded-lg text-text-secondary hover:text-[#EF4444] transition"
                        title="Delete Content (Take Down)"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                    {r.videos?.profiles && (
                      <button type="button" aria-label="button" 
                        onClick={() => handleSuspendCreator(r.videos.profiles.id, true)}
                        className="p-1.5 bg-bg-base/45 border border-border-subtle rounded-lg text-text-secondary hover:text-red-500 transition"
                        title="Suspend Uploader Account"
                      >
                        <Ban className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-secondary bg-[#121214]">
                    No reports match criteria.
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
