import React from 'react';
import { Home, Users, PlaySquare, FileText, TrendingUp, RefreshCw, Eye, CheckCircle, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, BarChart, Bar, CartesianGrid } from 'recharts';
import { cn } from '../../lib/utils';

interface AdminDashboardProps {
  stats: {
    totalUsers: number;
    totalVideos: number;
    totalReports: number;
    pendingApps: number;
  };
  reports: any[];
  creators: any[];
  categories: any[];
  isRefreshing: boolean;
  handleRefresh: () => Promise<void>;
  handleDismissReport: (id: string) => Promise<void>;
  handleReviewReport: (id: string, status: string) => Promise<void>;
  handleViewVideo: (video: any) => void;
}

export default function AdminDashboard({
  stats,
  reports,
  creators,
  categories,
  isRefreshing,
  handleRefresh,
  handleDismissReport,
  handleReviewReport,
  handleViewVideo,
}: AdminDashboardProps) {

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6'];

  const userGrowthData = [
    { name: 'May 1', users: 1200 },
    { name: 'May 8', users: 1800 },
    { name: 'May 15', users: 2400 },
    { name: 'May 22', users: 3100 },
    { name: 'May 29', users: Math.max(stats.totalUsers, 3200) },
  ];

  const topCategoriesData = categories.slice(0, 5).map(c => ({
    name: c.name,
    value: c.videoCount || 0
  }));
  const hasCategoryData = topCategoriesData.some(c => c.value > 0);
  const pieData = hasCategoryData ? topCategoriesData : [{ name: 'Empty', value: 1 }];

  return (
    <div className="gap-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
          <p className="text-zinc-500 text-xs mt-1">Real-time engagement telemetry & content moderation.</p>
        </div>
        <button type="button" aria-label="button" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-xl text-sm font-medium transition-all"
        >
          <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Syncing..." : "Sync Control"}
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Users Card */}
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-white/10">
          <div className="text-zinc-400 text-xs font-mono uppercase tracking-wider mb-2">Total Directory Users</div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</span>
            <div className="flex flex-col items-end">
              <TrendingUp className="size-4 text-zinc-500 mb-1" />
              <span className="text-[#10B981] text-xs font-semibold flex items-center gap-0.5">↑ 14.2%</span>
            </div>
          </div>
        </div>

        {/* Total Creators Card */}
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-white/10">
          <div className="text-zinc-400 text-xs font-mono uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Verified Creators</span>
            <Users className="size-4 text-zinc-600" />
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-white">{creators.length.toLocaleString()}</span>
            <span className="text-[#10B981] text-xs font-semibold flex items-center gap-0.5">↑ 8.3%</span>
          </div>
        </div>

        {/* Total Videos Card */}
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-white/10">
          <div className="text-zinc-400 text-xs font-mono uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Uploaded Videos</span>
            <PlaySquare className="size-4 text-zinc-600" />
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-white">{stats.totalVideos.toLocaleString()}</span>
            <span className="text-[#10B981] text-xs font-semibold flex items-center gap-0.5">↑ 19.5%</span>
          </div>
        </div>

        {/* Total Reports Card */}
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-white/10">
          <div className="text-zinc-400 text-xs font-mono uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Outstanding Reports</span>
            <FileText className="size-4 text-zinc-650" />
          </div>
          <div className="flex items-end justify-between">
            <span className={cn("text-2xl font-bold", stats.totalReports > 0 ? "text-[#EF4444]" : "text-white")}>
              {stats.totalReports.toLocaleString()}
            </span>
            <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full border", stats.totalReports > 0 ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-white/5 border-white/5 text-zinc-500")}>
              {stats.totalReports > 0 ? 'CRITICAL' : 'OK'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* User Growth */}
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5">
          <h3 className="text-zinc-400 text-sm font-semibold mb-4 flex items-center gap-2">
            <span>User Acquisition</span>
            <span className="text-[10px] bg-[#F97316]/10 text-[#F97316] px-2 py-0.5 rounded-full font-mono uppercase">Telemetry</span>
          </h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#fff' }} />
                <Line type="monotone" dataKey="users" stroke="#F97316" strokeWidth={3} dot={{ fill: '#F97316', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share */}
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 flex flex-row items-center justify-between">
          <div className="w-1/2 flex flex-col justify-between h-full py-1">
            <div>
              <h3 className="text-zinc-400 text-sm font-semibold mb-3">Topic Categories</h3>
              <p className="text-zinc-650 text-[11px] leading-relaxed">Distribution of tagged content across product domains.</p>
            </div>
            <div className="flex flex-col gap-1.5 mt-4">
              {hasCategoryData ? topCategoriesData.map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-zinc-300 truncate max-w-[85px]">{cat.name}</span>
                  </div>
                  <span className="text-zinc-500 font-bold">{cat.value}</span>
                </div>
              )) : (
                <div className="text-zinc-500 text-xs">No active video categories assigned.</div>
              )}
            </div>
          </div>
          <div className="h-[140px] w-1/2 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={4}
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

        {/* High Risk Content Card */}
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-zinc-400 text-sm font-semibold mb-3">Moderation Pipeline</h3>
            <p className="text-zinc-6 text-xs leading-relaxed mb-4">Urgent review cues extracted from community flagging.</p>
          </div>
          <div className="gap-y-3">
            {reports.slice(0, 3).map((r, i) => (
              <div key={r.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-2 rounded-full bg-[#EF4444] animate-pulse" />
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate max-w-[120px]">{r.reason || 'Flagged content'}</p>
                    <p className="text-zinc-500 text-[10px] truncate">by {r.profiles?.username || 'user'}</p>
                  </div>
                </div>
                <button type="button" aria-label="button" 
                  onClick={() => handleViewVideo(r.videos)}
                  className="px-2.5 py-1 text-[10px] bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-1 font-semibold transition"
                >
                  Inspect
                </button>
              </div>
            ))}
            {reports.length === 0 && (
              <div className="text-center py-6 border border-dashed border-white/5 rounded-xl">
                <p className="text-zinc-500 text-xs font-mono">No reports in queue</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Trending Categories Bar Chart Row */}
      <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 mt-6">
        <h3 className="text-zinc-400 text-sm font-semibold mb-4 flex items-center gap-2">
          <span>Top 5 Trending Categories by Video Count</span>
          <span className="text-[10px] bg-[#3B82F6]/10 text-[#3B82F6] px-2 py-0.5 rounded-full font-mono uppercase">Distribution</span>
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[...categories].sort((a, b) => (b.videoCount || 0) - (a.videoCount || 0)).slice(0, 5).map(c => ({ name: c.name, count: c.videoCount || 0 }))}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#fff' }} 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Embedded Live Reports Table */}
      <div className="bg-[#141416] border border-white/5 rounded-2xl overflow-hidden mt-6 shadow-xl">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-white text-sm font-semibold flex items-center gap-2">
              <span>Active Community Warnings</span>
              <span className="bg-[#EF4444]/15 border border-red-500/20 text-[#EF4444] px-2 py-0.5 rounded-full font-mono text-[10px]">
                {reports.length} pending
              </span>
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181a] border-b border-white/5 text-zinc-500 uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-4 px-5 font-semibold">Flag reason</th>
                <th className="py-4 px-5 font-semibold">Uploader Info</th>
                <th className="py-4 px-5 font-semibold">Reported By</th>
                <th className="py-4 px-5 font-semibold">Community Score</th>
                <th className="py-4 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-medium">
              {reports.slice(0, 6).map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.01] group transition-all">
                  <td className="py-4 px-5 text-white flex flex-col justify-start">
                    <span className="font-semibold text-[13px]">{r.reason || 'Violation Flagged'}</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">{r.id.substring(0, 8)}</span>
                  </td>
                  <td className="py-4 px-5 text-zinc-400">
                    <span className="text-zinc-33">{r.videos?.profiles?.username || 'Unknown Creator'}</span>
                  </td>
                  <td className="py-4 px-5 text-zinc-500">@{r.profiles?.username || 'user'}</td>
                  <td className="py-4 px-5">
                    <span className={cn(
                      "font-mono px-2 py-0.5 border text-[11px] font-semibold rounded-full",
                      r.videos?.trust_score < 70 ? "bg-red-500/10 border-red-500/20 text-red-500" :
                      r.videos?.trust_score < 90 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                      "bg-green-500/10 border-green-500/20 text-green-500"
                    )}>
                      {r.videos?.trust_score || 100} / 100
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right font-mono flex justify-end gap-2 shrink-0">
                    <button type="button" aria-label="button" 
                      onClick={() => handleViewVideo(r.videos)}
                      className="p-1.5 rounded-lg border border-white/5 bg-[#0c0c0e]/45 hover:bg-white/5 text-zinc-400 hover:text-white transition"
                      title="Inspect Video"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    <button type="button" aria-label="button" 
                      onClick={() => handleDismissReport(r.id)}
                      className="p-1.5 rounded-lg border border-white/5 bg-[#0c0c0e]/45 hover:bg-green-500/10 text-zinc-400 hover:text-green-500 transition"
                      title="Dismiss Report"
                    >
                      <CheckCircle className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 bg-[#121214]">
                    No pending community warning reports. System safe.
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
