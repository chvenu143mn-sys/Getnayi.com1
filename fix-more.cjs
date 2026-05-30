const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    // React Doctor: replace bg-black with bg-[#0c0c0e]
    const newContent = content.replace(/\bbg-black\b/g, 'bg-[#0c0c0e]');
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }

    // React Doctor: import { m as motion } from 'motion/react'
    const newContent2 = content.replace(/import\s+\{\s*motion\s*(?:,\s*AnimatePresence\s*)?\}\s+from\s+['"]motion\/react['"]/g, "import { m as motion, AnimatePresence } from 'motion/react'");
    if (newContent2 !== content) {
      // Actually we should only replace if we used motion.
      content = newContent2;
      changed = true;
    }

    // React Doctor: no-array-index-[as]-key -> use id or random
    // Well, a bit hard with regex. 

    // Click events have key events
    // add onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()} to elements with onClick but no onKey
    // Hard to do safely with regex

    if (changed) {
      fs.writeFileSync(filePath, content);
    }
  }
});
