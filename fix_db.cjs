const fs = require('fs');
let content = fs.readFileSync('database.sql', 'utf8');

content = content.replace(/\(SELECT is_admin FROM public\.profiles WHERE public\.profiles\.id = auth\.uid\(\)\) = true/g, 'public.is_admin()');
content = content.replace(/\(SELECT is_admin FROM public\.profiles WHERE id = auth\.uid\(\)\) = true/g, 'public.is_admin()');
content = content.replace(/\(SELECT is_admin FROM public\.profiles WHERE id = auth\.uid\(\)\) IS NOT TRUE/g, 'NOT public.is_admin()');

fs.writeFileSync('database.sql', content);
