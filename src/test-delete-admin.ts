import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function test() {
  const { data: videos } = await supabase.from('videos').select('id, user_id').limit(1);
  if (!videos || !videos.length) return console.log('no videos');
  const videoId = videos[0].id;
  
  // try to delete it
  const { error } = await supabase.from('videos').delete().eq('id', videoId);
  console.log("Delete error?", error);
}
test();
