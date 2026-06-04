import * as fs from 'fs';

let content = fs.readFileSync('src/pages/Upload.tsx', 'utf8');

if (!content.includes('const [showPreviewModal')) {
    content = content.replace(
        'const [showLinkWarning, setShowLinkWarning] = useState(false);',
        'const [showLinkWarning, setShowLinkWarning] = useState(false);\n  const [showPreviewModal, setShowPreviewModal] = useState(false);'
    );
}

const footerTarget = /\{\/\* Footer Action \*\/\}\s*<div className="px-5 pb-\[calc\(1\.5rem\+env\(safe-area-inset-bottom\)\)\] pt-4 shrink-0 bg-\[#0c0c0e\]">\s*\{error && <p className="text-red-400 text-xs mb-3 text-center">\{error\}<\/p>\}\s*<button type="button" aria-label="button"\s+onClick=\{handleUpload\}\s+disabled=\{!file \|\| !isUrlValid \|\| !mainProductFile \|\| !productName.trim\(\) \|\| !productPrice.trim\(\) \|\| isUploading\}\s+className="w-full bg-\[#ef2950\] hover:bg-\[#ff3b61\] disabled:opacity-50 active:scale-\[0\.98\] text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center text-\[16px\] shadow-\[0_4px_14px_rgba\(239,41,80,0\.5\)\] tracking-wide"\s*>\s*\{isUploading \? <Loader2 className="size-5 animate-spin" \/> : 'Publish Post'\}\s*<\/button>\s*<\/div>/;

const footerReplacement = `{/* Footer Action */}
      <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 shrink-0 bg-[#0c0c0e]">
         {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}
         <div className="flex gap-3">
           <button type="button" aria-label="Preview" 
             onClick={() => setShowPreviewModal(true)}
             disabled={!preview}
             className="w-1/3 bg-[#151518] hover:bg-[#1a1a20] active:scale-[0.98] border border-white/10 disabled:opacity-50 text-white font-bold py-4 px-2 rounded-2xl transition-all text-[15px] shadow-sm flex items-center justify-center gap-2"
           >
             Preview
           </button>
           <button type="button" aria-label="button"  
             onClick={handleUpload}
             disabled={!file || !isUrlValid || !mainProductFile || !productName.trim() || !productPrice.trim() || isUploading}
             className="flex-1 w-full bg-[#ef2950] hover:bg-[#ff3b61] disabled:opacity-50 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center text-[16px] shadow-[0_4px_14px_rgba(239,41,80,0.5)] tracking-wide"
           >
             {isUploading ? <Loader2 className="size-5 animate-spin" /> : 'Publish Post'}
           </button>
         </div>
      </div>`;

if (content.match(footerTarget)) {
    content = content.replace(footerTarget, footerReplacement);
    console.log("Replaced footer action");
} else {
    console.log("Footer target not found");
}

const modalHTML = `
      {/* Feed Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-[200] bg-black flex flex-col"
          >
            {/* Fake Feed Header */}
            <div className="absolute top-0 left-0 w-full z-20 pt-safe flex justify-between items-center p-4 bg-gradient-to-b from-black/50 to-transparent">
              <button title="Go Back" type="button" aria-label="Close" onClick={() => setShowPreviewModal(false)} className="text-white hover:text-white/80 p-1">
                <ArrowLeft className="size-6 drop-shadow-md" />
              </button>
              <div className="flex gap-5 drop-shadow-md font-sans">
                 <span className="text-white font-bold text-[17px] tracking-wide relative after:content-[''] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-1 after:bg-white after:rounded-full">For You</span>
                 <span className="text-white/60 font-bold text-[17px] tracking-wide">Following</span>
              </div>
              <div className="w-8 flex justify-end">
                <Search className="size-6 text-white drop-shadow-md" />
              </div>
            </div>
            
            <div className="relative flex-1 bg-black overflow-hidden h-full">
              <video 
                src={preview || undefined} 
                className="w-full h-full object-cover" 
                autoPlay 
                loop 
                muted={isMuted}
                playsInline
              />

              {/* Feed Text/Controls Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

              {/* Bottom Left Info Panel */}
              <div className="absolute bottom-[80px] left-0 right-[60px] p-4 flex flex-col justify-end z-10 pointer-events-auto pb-safe">
                <div className="flex items-center">
                  <span className="font-bold text-white text-[16px] tracking-wide drop-shadow-md">
                    {user?.user_metadata?.username || 'user'}
                  </span>
                </div>
                {caption && (
                  <div className="mt-2 text-left pointer-events-auto">
                    <p className="text-white/95 text-[14px] font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-[1.3] line-clamp-2 font-normal pr-2">
                       {caption}
                    </p>
                  </div>
                )}
                {hashtags && (
                  <div className="mt-1.5 pointer-events-auto flex flex-wrap gap-1">
                    {hashtags.split(',').slice(0,3).map((tag, i) => (
                      <span key={i} className="text-[#ef2950] font-semibold text-[13px] drop-shadow-md shadow-black font-sans">{tag.trim().startsWith('#') ? tag.trim() : '#' + tag.trim()}</span>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2 mt-4 pointer-events-auto">
                  <div className="group flex items-center bg-[#0c0c0e]/45 backdrop-blur-md rounded-xl p-1.5 pr-4 w-fit border border-white/10 shadow-md text-left">
                    <div className="size-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center mr-3 border border-white/5 bg-zinc-900">
                       {mainProductPreview ? <img src={mainProductPreview} alt="Product" className="size-full object-cover" /> : <ShoppingBag className="size-5 text-white/50" />}
                    </div>
                    <div className="flex flex-col items-start justify-center max-w-[170px]">
                       <span className="text-[13px] font-sans font-semibold text-white/95 leading-tight truncate w-full">
                         {productName || "Product Name"}
                       </span>
                       <span className="text-[12px] font-sans text-rose-450 font-bold mt-0.5">
                         {productPrice ? \`₹\${parseFloat(productPrice).toLocaleString('en-IN')}\` : "Price"}
                       </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side Icons */}
              <div className="absolute bottom-[80px] right-2 w-14 flex flex-col items-center gap-y-5 z-20 pointer-events-auto pb-safe">
                <div className="relative mb-2">
                  <div className="size-[48px] rounded-full border-[1.5px] border-white/80 bg-zinc-800 overflow-hidden shrink-0 shadow-sm flex flex-col justify-center items-center">
                     <span className="text-white text-xl font-bold">{user?.user_metadata?.username ? user.user_metadata.username.charAt(0).toUpperCase() : 'U'}</span>
                  </div>
                  <button title="Follow" className="absolute -bottom-2 left-1/2 -translate-x-1/2 size-6 rounded-full bg-[#ef2950] text-white flex items-center justify-center shadow-md border-[2px] border-black transition-transform active:scale-95 z-20">
                     <Plus className="size-4" strokeWidth={3} />
                  </button>
                </div>
                <div className="flex flex-col items-center group">
                  <Heart className="size-9 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                  <span className="text-white font-sans text-[13px] font-semibold drop-shadow-md">0</span>
                </div>
                <div className="flex flex-col items-center group mt-1">
                  <Bookmark className="size-9 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                  <span className="text-white font-sans text-[13px] font-semibold drop-shadow-md">0</span>
                </div>
                <div className="flex flex-col items-center group mt-1">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="white" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                     <path d="M21 12l-7-7v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19l7-7z"/>
                  </svg>
                  <span className="text-white font-sans text-[13px] font-semibold drop-shadow-md">0</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
`;

if (!content.includes('Feed Preview Modal')) {
    content = content.replace(
        '{/* Link Verification Warning Popup */}',
        modalHTML + '\n\n      {/* Link Verification Warning Popup */}'
    );
    console.log("Added modal HTML");
}

fs.writeFileSync('src/pages/Upload.tsx', content);
