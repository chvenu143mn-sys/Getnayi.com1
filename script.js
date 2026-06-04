const fs = require('fs');
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf-8');
const search = /<button type="button" aria-label="button"\s+onClick=\{\(e\) => handleDeleteVideoClick\(e, video.id\)\}\s+className="absolute top-2 right-2 p-1.5 bg-\[#0c0c0e\]\/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-\[#0c0c0e\]\/80"\s+>\s+<Trash2 className="size-3.5" \/>\s+<\/button>/;
const repl = `                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" aria-label="Edit Video"
                      onClick={(e) => handleEditVideoClick(e, video)} 
                      className="p-1.5 bg-[#0c0c0e]/50 text-white rounded-full hover:bg-[#0c0c0e]/80"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button type="button" aria-label="button"  
                      onClick={(e) => handleDeleteVideoClick(e, video.id)} 
                      className="p-1.5 bg-[#0c0c0e]/50 text-white rounded-full hover:bg-[#0c0c0e]/80"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>`;
code = code.replace(search, repl);
fs.writeFileSync('src/pages/Profile.tsx', code);
console.log('Done replacement');
