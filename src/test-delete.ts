import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function test() {
  const { data: videos } = await supabase.from('videos').select('id, user_id').limit(1);
  if (!videos || !videos.length) return console.log('no videos');
  const videoId = videos[0].id;
  const userId = videos[0].user_id;
  console.log('Got video:', videoId, 'user:', userId);
  
  // Wait, I can't delete it using ANON key because it enforces RLS auth.uid() = user_id
  // But wait, the browser uses ANON key and the auth token.
  // We can't easily simulate that here, unless I generate a token... But maybe the RLS policy is the issue!
}
test();
