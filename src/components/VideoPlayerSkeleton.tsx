import React from 'react';
import { cn } from '../lib/utils';

export function VideoPlayerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("h-[100dvh] w-full shrink-0 snap-start snap-always relative bg-[#0c0c0e] flex flex-col justify-end p-0 overflow-hidden", className)}>
      <div className="absolute inset-0 pointer-events-none bg-zinc-900 animate-pulse" />
      
      {/* Right Side Action Buttons Skeleton */}
      <div className="absolute bottom-[calc(90px+env(safe-area-inset-bottom))] right-2 w-14 flex flex-col items-center gap-y-[18px] z-20 pointer-events-none">
        {/* Avatar */}
        <div className="size-[42px] bg-white/10 rounded-full animate-pulse border-[1.5px] border-white/20 mb-1" />
        
        {/* Like */}
        <div className="flex flex-col items-center">
          <div className="size-[28px] bg-white/10 rounded-full animate-pulse" />
          <div className="w-6 h-2.5 bg-white/10 rounded animate-pulse mt-1.5" />
        </div>
        
        {/* Comment */}
        <div className="flex flex-col items-center">
          <div className="size-[28px] bg-white/10 rounded-full animate-pulse" />
          <div className="w-6 h-2.5 bg-white/10 rounded animate-pulse mt-1.5" />
        </div>
        
        {/* Save */}
        <div className="flex flex-col items-center">
          <div className="size-[28px] bg-white/10 rounded-full animate-pulse" />
          <div className="w-6 h-2.5 bg-white/10 rounded animate-pulse mt-1.5" />
        </div>
        
        {/* Share */}
        <div className="flex flex-col items-center">
          <div className="size-[28px] bg-white/10 rounded-full animate-pulse" />
          <div className="w-6 h-2.5 bg-white/10 rounded animate-pulse mt-1.5" />
        </div>

        {/* Report */}
        <div className="flex flex-col items-center">
          <div className="size-[28px] bg-white/10 rounded-full animate-pulse" />
          <div className="w-8 h-2.5 bg-white/10 rounded animate-pulse mt-1.5" />
        </div>
      </div>

      {/* Bottom Info Skeleton */}
      <div className="absolute bottom-[calc(90px+env(safe-area-inset-bottom))] left-3 right-16 flex flex-col justify-end pointer-events-none z-10">
        <div className="flex flex-col mb-1.5 max-w-[90%]">
          
          {/* Tags / Store link */}
          <div className="mb-2 flex items-center gap-2">
            <div className="w-16 h-4 bg-white/10 rounded animate-pulse" />
            <div className="w-20 h-4 bg-[#d9183b]/30 rounded animate-pulse" />
          </div>

          {/* Username area */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-32 h-5 bg-white/10 rounded animate-pulse" />
            <div className="w-16 h-5 bg-[#d9183b]/50 rounded-full animate-pulse ml-2" />
          </div>

          {/* Caption text */}
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="w-full h-3.5 bg-white/10 rounded animate-pulse" />
            <div className="w-4/5 h-3.5 bg-white/10 rounded animate-pulse" />
          </div>

          {/* Product CTA Card */}
          <div className="flex flex-col gap-2 mt-5">
            <div className="flex items-center bg-[#0c0c0e]/40 rounded-xl p-1.5 pr-4 w-48 border border-white/5 shadow-md">
              <div className="size-10 rounded-lg bg-white/10 animate-pulse shrink-0 mr-3" />
              <div className="flex flex-col gap-1.5 w-full">
                 <div className="w-full h-3 bg-white/10 rounded animate-pulse" />
                 <div className="w-16 h-3 bg-rose-500/30 rounded animate-pulse" />
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
