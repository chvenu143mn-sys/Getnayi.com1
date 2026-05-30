import React from 'react';
import { cn } from '../lib/utils';

export function VideoPlayerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("h-[100dvh] w-full shrink-0 snap-start snap-always relative bg-[#0c0c0e] flex flex-col justify-end p-4 pb-[80px] overflow-hidden", className)}>
      <div className="absolute inset-0 pointer-events-none bg-zinc-900/40 animate-pulse" />
      
      {/* Side Actions Skeleton */}
      <div className="absolute right-3 bottom-[100px] flex flex-col items-center gap-y-6 z-10">
        <div className="size-10 bg-white/5 rounded-full animate-pulse border-2 border-transparent" />
        <div className="size-8 bg-white/5 rounded-full animate-pulse" />
        <div className="size-8 bg-white/5 rounded-full animate-pulse" />
        <div className="size-8 bg-white/5 rounded-full animate-pulse" />
      </div>

      {/* Bottom Info Skeleton */}
      <div className="gap-y-4 w-3/4 z-10 mb-6 flex flex-col">
        <div className="w-24 h-4 bg-white/10 rounded animate-pulse" />
        <div className="flex flex-col gap-y-2 mt-1">
          <div className="w-full h-3 bg-white/10 rounded animate-pulse" />
          <div className="w-4/5 h-3 bg-white/10 rounded animate-pulse" />
        </div>
        {/* Product Card Skeleton */}
        <div className="w-48 h-10 bg-white/10 rounded-lg animate-pulse mt-4" />
      </div>
    </div>
  );
}
