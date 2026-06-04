import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await sb.from('videos').select('id, status, created_at, video_url').order('created_at', { ascending: false }).limit(20);
  console.log(JSON.stringify(data, null, 2));
}
run();
