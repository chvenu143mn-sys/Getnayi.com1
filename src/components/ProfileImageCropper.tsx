import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, Sliders, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileImageCropperProps {
  imageSrc: string;
  onCropCompleted: (croppedFile: File, croppedPreviewUrl: string) => void;
  onCancel: () => void;
  fileName: string;
}

export const ProfileImageCropper: React.FC<ProfileImageCropperProps> = ({
  imageSrc,
  onCropCompleted,
  onCancel,
  fileName
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const prevImageSrc = useRef<string>(imageSrc);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  if (imageSrc !== prevImageSrc.current) {
    prevImageSrc.current = imageSrc;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  const viewportSize = 280; // Size of the crop window in the UI
  const targetSize = 320; // Instagram standard circular size (320x320)
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  // Drag handlers for mouse
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    // Calculate new offset
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Apply bounds checking to prevent dragging completely out of view
    const bounds = getBounds();
    setOffset({
      x: Math.max(bounds.minX, Math.min(bounds.maxX, newX)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, newY))
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Drag handlers for touch
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({
      x: touch.clientX - offset.x,
      y: touch.clientY - offset.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    const bounds = getBounds();
    setOffset({
      x: Math.max(bounds.minX, Math.min(bounds.maxX, newX)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, newY))
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Bounds calculator based on current size and zoom
  const getBounds = () => {
    if (!naturalSize.width || !naturalSize.height) {
      return { minX: -200, maxX: 200, minY: -200, maxY: 200 };
    }

    const { width, height } = naturalSize;
    const initialScale = Math.max(viewportSize / width, viewportSize / height);
    const currWidth = width * initialScale * zoom;
    const currHeight = height * initialScale * zoom;

    // Bounds configured to keep viewport fully filled (just like Instagram)
    const maxX = Math.max(0, (currWidth - viewportSize) / 2);
    const minX = -maxX;
    const maxY = Math.max(0, (currHeight - viewportSize) / 2);
    const minY = -maxY;

    return { minX, maxX, minY, maxY };
  };

  // Perform canvas crop
  const handleApplyCrop = async () => {
    if (!imageRef.current || !naturalSize.width) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Enable premium image rendering options
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const { width: naturalWidth, height: naturalHeight } = naturalSize;
      
      // Calculate layout matching the UI exactly
      const initialScale = Math.max(viewportSize / naturalWidth, viewportSize / naturalHeight);
      const renderWidth = naturalWidth * initialScale;
      const renderHeight = naturalHeight * initialScale;

      const ratio = targetSize / viewportSize;

      // Scale to viewport zoom
      const scaledWidth = renderWidth * zoom;
      const scaledHeight = renderHeight * zoom;

      // Current left/top corner coordinates of the rendered image within viewport
      const posX = (viewportSize - scaledWidth) / 2 + offset.x;
      const posY = (viewportSize - scaledHeight) / 2 + offset.y;

      // Draw onto target size canvas
      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.drawImage(
        imageRef.current,
        posX * ratio,
        posY * ratio,
        scaledWidth * ratio,
        scaledHeight * ratio
      );

      // Convert to blob and create a file
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("Failed to create crop blob");
          return;
        }

        const croppedFile = new File([blob], fileName.replace(/\.[^/.]+$/, "") + "_cropped.jpg", {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        const croppedPreviewUrl = URL.createObjectURL(croppedFile);
        onCropCompleted(croppedFile, croppedPreviewUrl);
      }, 'image/jpeg', 0.92);

    } catch (err) {
      console.error("Error drawing cropped image:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#09090b]/98 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none">
      
      {/* Header Bar */}
      <div className="w-full max-w-sm mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="size-10 flex items-center justify-center text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 transition-all rounded-full border border-white/10 cursor-pointer"
        >
          <X className="size-5" />
        </button>
        <span className="text-[14px] font-semibold text-zinc-200 tracking-wide">
          Crop Photo
        </span>
        <button
          type="button"
          onClick={handleApplyCrop}
          className="h-10 px-4 flex items-center gap-1.5 text-xs font-bold text-[#ff5a36] bg-[#ff5a36]/10 hover:bg-[#ff5a36]/20 active:scale-95 transition-all rounded-full border border-[#ff5a36]/20 cursor-pointer"
        >
          <Check className="size-4" />
          <span>Done</span>
        </button>
      </div>

      {/* Main Cropper Container */}
      <div className="relative bg-zinc-950 p-6 rounded-2xl border border-white/10 w-full max-w-sm shadow-2xl flex flex-col items-center">
        
        {/* Aspect Ratio Guideline frame */}
        <div className="w-full flex justify-between items-center mb-4 text-xs font-medium text-zinc-400">
          <span className="flex items-center gap-1">
            <Sliders className="size-3 text-zinc-400" />
            Instagram Standard
          </span>
          <span className="bg-zinc-800 text-[10px] text-zinc-300 px-2 py-0.5 rounded-full font-mono font-medium">
            320 × 320 px (1:1)
          </span>
        </div>

        {/* Viewport Box */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-[280px] h-[280px] rounded-full overflow-hidden bg-zinc-900 border-2 border-[#ff5a36]/40 shadow-inner cursor-move select-none"
          style={{
            touchAction: 'none'
          }}
        >
          {/* Circular mask with surrounding shaded overlay */}
          <div className="absolute inset-0 pointer-events-none rounded-full border border-white/20 z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
          
          {/* Guidelines inside the circle */}
          <div className="absolute inset-0 pointer-events-none rounded-full border border-dashed border-white/10 z-10 flex items-center justify-center">
            <div className="w-2/3 h-2/3 rounded-full border border-dashed border-white/5" />
          </div>

           {/* Render image */}
          {imageSrc && (
            <img               ref={imageRef}
              src={imageSrc}
              alt="To crop"
              onLoad={handleImageLoad}
              className="absolute pointer-events-none max-w-none select-none origin-center"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                left: naturalSize.width ? `${(viewportSize - naturalSize.width * Math.max(viewportSize / naturalSize.width, viewportSize / naturalSize.height)) / 2}px` : '0px',
                top: naturalSize.height ? `${(viewportSize - naturalSize.height * Math.max(viewportSize / naturalSize.width, viewportSize / naturalSize.height)) / 2}px` : '0px',
                width: naturalSize.width ? `${naturalSize.width * Math.max(viewportSize / naturalSize.width, viewportSize / naturalSize.height)}px` : '100%',
                height: naturalSize.height ? `${naturalSize.height * Math.max(viewportSize / naturalSize.width, viewportSize / naturalSize.height)}px` : '100%',
              }}
            loading="lazy" decoding="async" />
          )}
        </div>

        {/* Zoom Controls */}
        <div className="w-full mt-6 bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-sans">Adjust Scale / Zoom</span>
            <span className="font-mono text-zinc-400 font-semibold">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(1, prev - 0.1))}
              className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full"
            >
              <ZoomOut className="size-4" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#ff5a36] h-1.5 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
            />
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
              className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>
        </div>

        {/* Hint text */}
        <p className="text-[11px] text-zinc-400 mt-4 text-center leading-relaxed">
          Drag photo to position your face within the circle. Standard 1:1 format provides a precise fit for headers, comments, and recommendations.
        </p>

      </div>
    </div>
  );
};
