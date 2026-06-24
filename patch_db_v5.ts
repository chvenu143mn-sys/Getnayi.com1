import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function runPatch() {
  console.log('Applying Database Enhancements and Architecture Patches (v5)...');

  const sql = `
-- 1. Create specialized indexes for our new workflow states
CREATE INDEX IF NOT EXISTS idx_videos_post_status ON public.videos(post_status) WHERE post_status = 'published';
CREATE INDEX IF NOT EXISTS idx_videos_is_verified ON public.videos(is_verified_real) WHERE is_verified_real = true;

-- 2. Materialized View: Trending Videos (refreshed periodically to offload real-time querying)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_trending_videos AS
SELECT 
    v.id,
    v.caption,
    v.video_url,
    v.thumbnail_url,
    v.user_id,
    v.views,
    v.status,
    v.post_status,
    v.created_at,
    COUNT(DISTINCT l.id) as like_count,
    COUNT(DISTINCT c.id) as comment_count,
    (COALESCE(v.views, 0) * 0.1 + COUNT(DISTINCT l.id) * 2.0 + COUNT(DISTINCT c.id) * 3.0) as trending_score
FROM public.videos v
LEFT JOIN public.likes l ON v.id = l.video_id AND l.created_at > (now() - interval '7 days')
LEFT JOIN public.comments c ON v.id = c.video_id AND c.created_at > (now() - interval '7 days')
WHERE v.status = 'active' AND (v.post_status = 'published' OR v.post_status IS NULL)
GROUP BY v.id
ORDER BY trending_score DESC;

-- Index on the materialized view for rapid reading
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trending_videos_id ON public.mv_trending_videos(id);
CREATE INDEX IF NOT EXISTS idx_mv_trending_videos_score ON public.mv_trending_videos(trending_score DESC);

-- 3. Function to refresh trending materialized view
CREATE OR REPLACE FUNCTION public.refresh_mv_trending_videos()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_trending_videos;
END;
$$;

-- 4. Materialized View: Creator Global Stats (to avoid heavy aggregations)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_creator_stats AS
SELECT 
  p.id as user_id,
  COUNT(v.id) as total_published_videos,
  COALESCE(SUM(v.views), 0) as total_views,
  p.trust_score
FROM public.profiles p
LEFT JOIN public.videos v ON p.id = v.user_id AND v.status = 'active'
GROUP BY p.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_creator_stats_user_id ON public.mv_creator_stats(user_id);

-- 5. Function to refresh creator stats materialized view
CREATE OR REPLACE FUNCTION public.refresh_mv_creator_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_creator_stats;
END;
$$;
  `;

  // Use a hack to execute raw SQL via an existing wrapper or an error-based approach if direct SQL is denied, 
  // but we can try generic RPC if 'exec_sql' exists, or 'run_sql'
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    if (error.message.includes('Could not find the function')) {
      console.warn('exec_sql RPC not found. Database patch must be applied via Supabase Dashboard manually or using a migration tool.');
      
      // Let's create an exec_sql function via the REST API if possible? No, we don't have access.
      // We'll write it to database.sql directly.
    } else {
        console.error('Error applying patch:', error);
    }
  } else {
    console.log('Database enhancements applied successfully via RPC.');
  }
}

runPatch();
