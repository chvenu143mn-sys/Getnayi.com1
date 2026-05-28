import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.log("No config");
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  console.log("Fetching a video to get a valid ID...");
  const { data: videos } = await supabase.from('videos').select('id').limit(1);
  if (!videos || !videos.length) {
    console.log("No videos found.");
    return;
  }
  const videoId = videos[0].id;
  console.log("Found video:", videoId);

  console.log("Testing RPC...");
  const { error } = await supabase.rpc('increment_video_views', { video_id_param: videoId });
  console.log("RPC result:", error ? error : "Success");
}

test();
