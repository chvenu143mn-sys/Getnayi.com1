import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  console.log('14 days ago:', fourteenDaysAgo);
  const { data, error } = await sb.from('videos')
           .select('id, video_url, created_at, status')
           .eq('status', 'active')
           .gte('created_at', fourteenDaysAgo);
  console.log(data);
  if (error) console.error(error);
}
run();
