import * as fs from 'fs';
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf-8');

const searchBtnGroup = /<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">[\s\S]*?<\/div>/;

const replBtnGroup = `<div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-opacity">
                    <div className="relative">
                      <button type="button" aria-label="More options"
                        onClick={(e) => {
                           e.stopPropagation();
                           setActiveMenuId(activeMenuId === video.id ? null : video.id);
                        }}
                        className="p-1.5 bg-[#0c0c0e]/60 text-white rounded-full hover:bg-[#0c0c0e]/90 backdrop-blur-sm"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                      
                      {activeMenuId === video.id && (
                         <div className="absolute top-full right-0 mt-1 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-10 flex flex-col">
                           <button type="button" 
                             onClick={(e) => handleEditVideoClick(e, video)}
                             className="text-left px-3 py-2 text-sm text-white hover:bg-white/5 flex items-center"
                           >
                             <Edit3 className="size-3.5 mr-2" /> Edit
                           </button>
                           <button type="button" 
                             onClick={(e) => handleDeleteVideoClick(e, video.id)}
                             className="text-left px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 flex items-center"
                           >
                             <Trash2 className="size-3.5 mr-2" /> Delete
                           </button>
                         </div>
                      )}
                    </div>
                  </div>`;

if(code.match(searchBtnGroup)){
  code = code.replace(searchBtnGroup, replBtnGroup);
  console.log("Replaced btn group");
}

const searchModalInputs = /<div>\s*<label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Hashtags \/ Tags \(comma separated\)<\/label>[\s\S]*?<\/div>/;

const replModalInputs = `<div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Product Name</label>
                  <input 
                    type="text"
                    value={editVideoProductName}
                    onChange={(e) => setEditVideoProductName(e.target.value)}
                    placeholder="Enter product name..."
                     className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Product Price</label>
                  <input 
                    type="number"
                    value={editVideoProductPrice}
                    onChange={(e) => setEditVideoProductPrice(e.target.value)}
                    placeholder="Enter product price..."
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Hashtags / Tags (comma separated)</label>
                  <textarea 
                    value={editVideoTags}
                    onChange={(e) => setEditVideoTags(e.target.value)}
                    className="w-full bg-[#151518] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors h-20 resize-none font-mono text-sm leading-relaxed"
                  />
                </div>`;

if(code.match(searchModalInputs)){
  code = code.replace(searchModalInputs, replModalInputs);
  console.log("Replaced modal inputs");
}

fs.writeFileSync('src/pages/Profile.tsx', code);
