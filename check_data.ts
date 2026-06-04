import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  let { data, error } = await sb
    .from('videos')
    .select('id, caption')
    .limit(10);
    
  console.log("All videos:", data);
}
run();
