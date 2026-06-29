import React from 'react';
import AdminVideos from './AdminVideos';

interface AdminModerationProps {
  videos: any[];
  categories: any[];
  handleDeleteVideo: (id: string) => Promise<void>;
  handleVerifyProduct: (id: string, isVerified: boolean) => Promise<void>;
  handleUpdateVideoCategory: (id: string, catId: string) => Promise<void>;
  handleUpdateVideoStatus: (id: string, status: string, reason?: string) => Promise<void>;
  handleViewVideo: (video: any) => void;
  isRefreshing: boolean;
}

export default function AdminModeration({
  videos,
  categories,
  handleDeleteVideo,
  handleVerifyProduct,
  handleUpdateVideoCategory,
  handleUpdateVideoStatus,
  handleViewVideo,
  isRefreshing
}: AdminModerationProps) {
  // Filter videos to only show those pending review
  const pendingVideos = videos.filter((v: any) => v.status === 'pending_review');

  return (
    <div className="gap-y-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-400 tracking-tight flex items-center gap-2">
          Moderation Queue
        </h1>
        <p className="text-text-secondary text-xs mt-1">
          Review flagged videos that were automatically captured from non-allowlisted e-commerce platforms. Approve or reject their feed entry.
        </p>
      </div>
      
      <AdminVideos
        videos={pendingVideos}
        categories={categories}
        handleDeleteVideo={handleDeleteVideo}
        handleVerifyProduct={handleVerifyProduct}
        handleUpdateVideoCategory={handleUpdateVideoCategory}
        handleUpdateVideoStatus={handleUpdateVideoStatus}
        handleViewVideo={handleViewVideo}
        isRefreshing={isRefreshing}
      />
    </div>
  );
}
