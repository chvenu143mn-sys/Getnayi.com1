import React, { useMemo } from 'react';
import { Video } from '../types';
import { parseVideoProduct } from '../utils/videoUtils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const fallbackData = [{ name: 'No Data', shortName: 'N/A', Views: 0, Likes: 0, Saves: 0 }];

interface CreatorAnalyticsProps {
  videos: Video[];
  engagementDetails: {
    likesByVideo: Record<string, number>;
    commentsByVideo: Record<string, number>;
    savesByVideo: Record<string, number>;
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const isPie = !label && payload[0]?.name;
    const title = isPie ? payload[0].name : label;
    const data = payload[0].payload;
    const hasMultipleSeries = payload.length > 1;

    return (
      <div className="bg-[#151518]/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl gap-y-1.5 font-sans min-w-[125px]">
        {title && (
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[150px]">{title}</p>
        )}
        <div className="gap-y-1">
          {isPie ? (
            <div className="flex items-center gap-x-2 text-[12.5px]">
              <span 
                className="size-2 rounded-full shrink-0" 
                style={{ backgroundColor: payload[0].payload?.color || payload[0].color || '#ef2950' }} 
              />
              <span className="text-zinc-300 font-medium">Value:</span>
              <span className="text-white font-mono font-bold">
                {payload[0].value >= 1000 ? (payload[0].value / 1000).toFixed(1) + 'K' : payload[0].value}
              </span>
            </div>
          ) : hasMultipleSeries ? (
            payload.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-x-2 text-[12.5px]">
                <span 
                  className="size-2 rounded-full shrink-0" 
                  style={{ backgroundColor: item.fill || item.color || '#ef2950' }} 
                />
                <span className="text-zinc-300 font-medium">{item.name}:</span>
                <span className="text-white font-mono font-bold">
                  {item.value >= 1000 ? (item.value / 1000).toFixed(1) + 'K' : item.value}
                </span>
              </div>
            ))
          ) : (
            <>
              {data && data.Views !== undefined ? (
                <>
                  <div className="flex items-center gap-x-2 text-[12.5px]">
                    <span className="size-2 rounded-full bg-[#3897f0] shrink-0" />
                    <span className="text-zinc-400 font-medium">Views:</span>
                    <span className="text-white font-mono font-bold">
                      {data.Views >= 1000 ? (data.Views / 1000).toFixed(1) + 'K' : data.Views}
                    </span>
                  </div>
                  {data.Likes !== undefined && (
                    <div className="flex items-center gap-x-2 text-[12.5px]">
                      <span className="size-2 rounded-full bg-[#ef2950]/60 shrink-0" />
                      <span className="text-zinc-400 font-medium">Likes:</span>
                      <span className="text-white font-mono font-bold">
                        {data.Likes >= 1000 ? (data.Likes / 1000).toFixed(1) + 'K' : data.Likes}
                      </span>
                    </div>
                  )}
                  {data.Saves !== undefined && (
                    <div className="flex items-center gap-x-2 text-[12.5px]">
                      <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-zinc-400 font-medium">Saves:</span>
                      <span className="text-white font-mono font-bold">
                        {data.Saves >= 1000 ? (data.Saves / 1000).toFixed(1) + 'K' : data.Saves}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                payload.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-x-2 text-[12.5px]">
                    <span 
                      className="size-2 rounded-full shrink-0" 
                      style={{ backgroundColor: item.fill || item.color || '#ef2950' }} 
                    />
                    <span className="text-zinc-300 font-medium">{item.name}:</span>
                    <span className="text-white font-mono font-bold">
                      {item.value >= 1000 ? (item.value / 1000).toFixed(1) + 'K' : item.value}
                    </span>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function CreatorAnalytics({ videos, engagementDetails }: CreatorAnalyticsProps) {
  // Only display analytics for published videos
  const publishedVideos = useMemo(() => {
    return videos.filter(v => (v as any).post_status === 'published' || v.status === 'active');
  }, [videos]);

  const displayVideos = useMemo(() => {
    return publishedVideos.map(v => {
      const parsedCaption = parseVideoProduct(v.caption);

      return {
        id: v.id,
        caption: parsedCaption.captionText || 'No description',
        views: v.views || 0,
        likes: engagementDetails.likesByVideo[v.id] || 0,
        saves: engagementDetails.savesByVideo[v.id] || 0,
        created_at: v.created_at,
      };
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [publishedVideos, engagementDetails]);

  const chartData = useMemo(() => {
    return displayVideos.slice(-10).map((v, i) => ({
      name: v.caption,
      shortName: `V${i + 1}`,
      Views: v.views,
      Likes: v.likes,
      Saves: v.saves
    }));
  }, [displayVideos]);

  const finalChartData = chartData.length > 0 ? chartData : fallbackData;

  const totalViews = useMemo(() => displayVideos.reduce((acc, v) => acc + v.views, 0), [displayVideos]);
  const totalLikes = useMemo(() => displayVideos.reduce((acc, v) => acc + v.likes, 0), [displayVideos]);
  const totalSaves = useMemo(() => displayVideos.reduce((acc, v) => acc + v.saves, 0), [displayVideos]);
  const commentsCount = useMemo(() => {
    return publishedVideos.reduce((acc, v) => acc + (engagementDetails.commentsByVideo[v.id] || 0), 0)
  }, [publishedVideos, engagementDetails]);
  
  const engagementRate = totalViews > 0 ? (((totalLikes + totalSaves + commentsCount) / totalViews) * 100).toFixed(1) : '0';

  return (
    <div className="p-4 bg-[#131316] border border-white/5 rounded-3xl shadow-lg flex flex-col my-4">
      <div className="flex flex-col mb-4">
        <h3 className="text-[16px] font-bold text-white tracking-wide">Summary Analytics</h3>
        <p className="text-[12.5px] font-medium text-emerald-400 mt-1">Real-time engagement for recent posts</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="flex flex-col p-3 bg-zinc-900 border border-white/5 rounded-2xl">
           <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Views</span>
           <span className="text-[18px] font-sans font-bold text-white tracking-tight">{totalViews >= 1000 ? (totalViews/1000).toFixed(1)+'K' : totalViews}</span>
        </div>
        <div className="flex flex-col p-3 bg-zinc-900 border border-white/5 rounded-2xl">
           <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Likes</span>
           <span className="text-[18px] font-sans font-bold text-white tracking-tight">{totalLikes >= 1000 ? (totalLikes/1000).toFixed(1)+'K' : totalLikes}</span>
        </div>
        <div className="flex flex-col p-3 bg-zinc-900 border border-white/5 rounded-2xl">
           <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Eng. Rate</span>
           <span className="text-[18px] font-sans font-bold text-white tracking-tight">{engagementRate}%</span>
        </div>
      </div>

      <div className="h-[260px] w-full text-zinc-400 text-xs mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={finalChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="shortName" stroke="#6b7280" style={{ fontSize: '10px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Bar dataKey="Views" fill="#3897f0" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Likes" fill="#ef2950" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Saves" fill="#facc15" radius={[4, 4, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
