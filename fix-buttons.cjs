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

    // Add aria-label to buttons if missing
    // We match <button followed by attributes. Since it can span multiple lines we use [\s\S]
    const newContent = content.replace(/<button\b((?:[^>](?!aria-label))*?)>/gi, (match, attribs) => {
       if (attribs.includes('aria-label')) return match;
       return `<button aria-label="button" ${attribs}>`;
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
