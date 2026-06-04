import * as fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const targetFunction = /app\.get\('\/api\/search', rateLimit\(\{ windowMs: 15 \* 60 \* 1000, max: 100 \}\), async \(req, res\) => \{[\s\S]*?res\.json\(\{ videos: data \}\);\s*\} catch \(err: any\) \{\s*console\.error\('Search Error:', err\);\s*return res\.status\(500\)\.json\(\{ error: 'Internal server error' \}\);\s*\}\s*\}\);/;

const replacement = `app.get('/api/search', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), async (req, res) => {
    try {
      if (!supabaseAdmin) throw new Error('Database Admin client not configured');
      const { q, category_id } = req.query;
      
      const qStr = (typeof q === 'string') ? q.trim() : '';

      if (qStr === '' && !category_id) {
        return res.json({ videos: [] });
      }

      let queryBuilder = supabaseAdmin
        .from('videos')
        .select(\`
          *,
          categories (id, name),
          profiles!inner (id, username, avatar_url, is_brand, trust_score),
          likes(count),
          comments(count),
          saved_videos(count)
        \`)
        .eq('status', 'active');

      if (category_id) {
         queryBuilder = queryBuilder.eq('category_id', category_id);
      }

      const orConditions: string[] = [];
      let queryTerm = '';
      if (qStr !== '') {
        queryTerm = qStr;
        const terms = queryTerm.split(/\\s+/).filter(w => w.length > 2);
        orConditions.push(\`caption.ilike.%\${queryTerm}%,search_aliases.ilike.%\${queryTerm}%,tags.cs.{\${queryTerm}}\`);
        for (const t of terms) {
           orConditions.push(\`caption.ilike.%\${t}%\`);
        }
        queryBuilder = queryBuilder.or(orConditions.join(','));
      }

      let { data: captionData, error } = await queryBuilder.limit(30);

      if (error && (error.message.includes('search_aliases') || error.message.includes('tags') || error.message.includes('trust_score'))) {
         console.warn("Missing database columns for search, falling back to basic search...");
         
         let retryBuilder = supabaseAdmin
          .from('videos')
          .select(\`
            *,
            categories (id, name),
            profiles!inner (id, username, avatar_url, is_brand),
            likes(count),
            comments(count),
            saved_videos(count)
          \`)
          .eq('status', 'active');
          
         if (category_id) {
            retryBuilder = retryBuilder.eq('category_id', category_id);
         }
         
         if (qStr !== '') {
            const basicOrConditions = [\`caption.ilike.%\${queryTerm}%\`];
            const terms = queryTerm.split(/\\s+/).filter(w => w.length > 2);
            for (const t of terms) {
               basicOrConditions.push(\`caption.ilike.%\${t}%\`);
            }
            retryBuilder = retryBuilder.or(basicOrConditions.join(','));
         }

          const retry = await retryBuilder.limit(30);
          captionData = retry.data;
          error = retry.error;
      }

      if (error) {
        console.error('Search query error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      let usernameData: any[] = [];
      if (qStr !== '') {
        let usernameBuilder = supabaseAdmin
          .from('videos')
          .select(\`
            *,
            categories (id, name),
            profiles!inner (id, username, avatar_url, is_brand),
            likes(count),
            comments(count),
            saved_videos(count)
          \`)
          .eq('status', 'active')
          .ilike('profiles.username', \`%\${queryTerm}%\`);
          
        if (category_id) {
          usernameBuilder = usernameBuilder.eq('category_id', category_id);
        }
        
        const usernameRes = await usernameBuilder.limit(30);
        usernameData = usernameRes.data || [];
        
        // Ensure username filter applied using JS due to postgraphql limitations on inner join
        usernameData = usernameData.filter(v => v.profiles && v.profiles.username.toLowerCase().includes(queryTerm.toLowerCase()));
      }

      // Merge and deduplicate results
      const allResults = [...(captionData || []), ...usernameData];
      const deduplicatedMap = new Map();
      for (const video of allResults) {
        if (!deduplicatedMap.has(video.id)) {
          deduplicatedMap.set(video.id, video);
        }
      }
      
      let data = Array.from(deduplicatedMap.values());
      
      // Additional price filter (JS side since JSON string parse via SQL might be overly complex right now)
      if (qStr !== '') {
          const underMatch = queryTerm.toLowerCase().match(/(?:under|below|less than)\\s*(?:rs\\.?|inr|₹)?\\s*(\\d+)/);
          if (underMatch) {
             const maxPrice = parseInt(underMatch[1], 10);
             data = data.filter((v: any) => {
                try {
                  const p = typeof v.caption === 'string' ? JSON.parse(v.caption) : v.caption;
                  if (p && p.product_price) {
                     return parseInt(p.product_price, 10) <= maxPrice;
                  }
                  return true; 
                } catch(e) { return true; }
             });
          }
      }

      return res.json({ videos: data });
    } catch (err: any) {
      console.error('Search Error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });`;

if (content.match(targetFunction)) {
    content = content.replace(targetFunction, replacement);
    fs.writeFileSync('server.ts', content);
    console.log('Replaced search function successfully');
} else {
    console.log('Search function not found. regex mismatch.');
}
