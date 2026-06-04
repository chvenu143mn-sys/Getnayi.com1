import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const queryTerm = "Saree under 1000";
  let { data, error } = await sb
    .from('videos')
    .select('id, caption')
    .or(`caption.ilike.%${queryTerm}%`)
    .limit(10);
    
  console.log("Valid spaces in or:", data, error);
}
run();
