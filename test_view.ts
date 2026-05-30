import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const { data, error } = await supabase.from('videos').select('id, public_profiles (id, username)').limit(1);
  console.log("Data:", JSON.stringify(data, null, 2));
  if (error) console.log("Error:", error);
}
test();
