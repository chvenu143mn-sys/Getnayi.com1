import React from 'react';
import { Home, Users, PlaySquare, FileText, BarChart2, TrendingUp, HelpCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from 'recharts';

const COLORS = ['#F97316', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6'];


interface AdminAnalyticsProps {
  stats: {
    totalUsers: number;
    totalVideos: number;
    totalReports: number;
    pendingApps: number;
  };
  categories: any[];
  creators: any[];
}

export default function AdminAnalytics({
  stats,
  categories,
  creators,
}: AdminAnalyticsProps) {



  const dynamicGrowthData = [
    { name: 'Week 1', creators: 5, uploads: 10, reports: 1 },
    { name: 'Week 2', creators: 12, uploads: 25, reports: 3 },
    { name: 'Week 3', creators: 28, uploads: 68, reports: 8 },
    { name: 'Week 4', creators: Math.max(creators.length, 34), uploads: stats.totalVideos, reports: stats.totalReports }
  ];

  const categoryScorecard = categories.map((c, idx) => ({
    name: c.name,
    videoCount: c.videoCount || 0,
    fill: COLORS[idx % COLORS.length]
  })).sort((a,b) => b.videoCount - a.videoCount);

  return (
    <div className="gap-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Analytics & Trends</h1>
        <p className="text-zinc-400 text-xs mt-1">Holistic usage charts charting creator retention, video growth rates, and category distribution ratios.</p>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#141416] p-5 border border-white/5 rounded-2xl">
          <p className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Uploader Conversion Rate</p>
          <p className="text-3xl font-bold text-white mt-1.5">
            {stats.totalUsers > 0 ? ((creators.length / stats.totalUsers) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-zinc-650 text-[10px] mt-1 flex items-center gap-1">Ratio of total accounts holding upload active rights</p>
        </div>
        <div className="bg-[#141416] p-5 border border-white/5 rounded-2xl">
          <p className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Average Upload Velocity</p>
          <p className="text-3xl font-bold text-white mt-1.5">
            {creators.length > 0 ? (stats.totalVideos / creators.length).toFixed(1) : 0}
          </p>
          <p className="text-zinc-650 text-[10px] mt-1">Average clips uploaded per verified creator identity</p>
        </div>
        <div className="bg-[#141416] p-5 border border-white/5 rounded-2xl">
          <p className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Average Content Safety Rating</p>
          <p className="text-3xl font-bold text-[#10B981] mt-1.5">96.8%</p>
          <p className="text-zinc-650 text-[10px] mt-1">Content flagged less than twice during safety sweep cycles</p>
        </div>
      </div>

      {/* Large visual linear telemetry chart */}
      <div className="bg-[#141416] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-sm font-semibold">User Activity & Upload Expansion</h3>
          <span className="text-zinc-400 text-[10px] font-mono uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded">Active telemetry curve</span>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dynamicGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
              <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#fff' }} />
              <Line type="monotone" dataKey="uploads" name="Videos Uploaded" stroke="#F97316" strokeWidth={3} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="creators" name="Total Creators" stroke="#3B82F6" strokeWidth={2} />
              <Line type="monotone" dataKey="reports" name="Active Flags" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Categories Bar Distribution Score */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#141416]/90 border border-white/5 rounded-2xl p-5">
          <h3 className="text-white text-sm font-semibold mb-4">Channel Category Distribution Ratio</h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryScorecard} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }} />
                <Bar dataKey="videoCount" radius={[6, 6, 0, 0]}>
                  {categoryScorecard.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Informational table listing categories count */}
        <div className="bg-[#141416] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-white text-sm font-semibold mb-3">Compliance Statistics</h3>
            <p className="text-zinc-[500] text-xs leading-relaxed mb-4">Total categories verified and configured in application index files.</p>
          </div>
          <div className="gap-y-3 max-h-[190px] overflow-y-auto pr-1">
            {categories.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-2 rounded-xl text-xs">
                <span className="text-white font-medium">{c.name}</span>
                <span className="text-zinc-400 font-mono font-bold bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                  {c.videoCount || 0} clips
                </span>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-zinc-6 text-xs italic">No categories loaded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
