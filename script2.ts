import * as fs from 'fs';
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf-8');

// Add new state variables
code = code.replace(
  /const \[editVideoTags, setEditVideoTags\] = useState\(''\);/,
  `const [editVideoTags, setEditVideoTags] = useState('');
  const [editVideoProductName, setEditVideoProductName] = useState('');
  const [editVideoProductPrice, setEditVideoProductPrice] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);`
);

// Add to handleEditVideoClick
code = code.replace(
  /setEditVideoTags\(Array\.isArray\(video\.tags\) \? video\.tags\.join\(', '\) : ''\);/,
  `setEditVideoTags(Array.isArray(video.tags) ? video.tags.join(', ') : '');
    setEditVideoProductName(parsedCaption.product_name || '');
    setEditVideoProductPrice(parsedCaption.product_price ? parsedCaption.product_price.toString() : '');
    setActiveMenuId(null);`
);

// Add to handleSaveVideoEdit
code = code.replace(
  /newCaptionObj\.captionText = editVideoCaptionText\.trim\(\);/,
  `newCaptionObj.captionText = editVideoCaptionText.trim();
      if (editVideoProductName.trim()) newCaptionObj.product_name = editVideoProductName.trim();
      if (editVideoProductPrice.trim() && !isNaN(Number(editVideoProductPrice))) newCaptionObj.product_price = Number(editVideoProductPrice);`
);

// Also close the active menu when clicking outside
code = code.replace(
  /const handleDeleteVideoClick = \(e: React\.MouseEvent, videoId: string\) => \{/,
  `const handleDeleteVideoClick = (e: React.MouseEvent, videoId: string) => {
    setActiveMenuId(null);`
);

// Add global click handler to close menu
if (!code.includes('handleGlobalClick')) {
  code = code.replace(
    /useEffect\(\(\) => \{/,
    `useEffect(() => {
      const handleGlobalClick = () => setActiveMenuId(null);
      window.addEventListener('click', handleGlobalClick);
      return () => window.removeEventListener('click', handleGlobalClick);
    }, []);\n\n  useEffect(() => {`
  );
}

fs.writeFileSync('src/pages/Profile.tsx', code);
console.log("Updated state and handlers");
