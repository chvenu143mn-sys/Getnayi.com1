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

    const newContent = content.replace(/<button([^>]*)>/g, (match, attribs) => {
      // If it already has type, skip it
      if (attribs.includes('type=') || attribs.includes('type {')) {
        return match;
      }
      return `<button type="button"${attribs}>`;
    });

    if (newContent !== content) {
      content = newContent;
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content);
    }
  }
});
