import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function test() {
  const { data } = await supabase.from('videos').select('id, views').limit(1);
  if (!data || data.length === 0) { console.log('No video'); return; }
  
  const video = data[0];
  console.log('Video stats before:', video);

  const { data: viewsData, error: viewError } = await supabase.from('video_views').insert({ video_id: video.id, session_token: 'test_token_' + Date.now() }).select('*');
  console.log('video_views insert output:', viewsData, viewError?.message);

  const rs = await supabase.rpc('increment_video_views', { video_id_param: video.id, session_token_param: 'test_token_' + Date.now() });
  console.log('RPC result:', rs);

  const { data: after } = await supabase.from('videos').select('id, views').eq('id', video.id).single();
  console.log('Video stats after:', after);
}
test();
