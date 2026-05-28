import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(url, key);

async function test() {
  console.log("Checking likes table...");
  const { data, error } = await supabase.from('likes').select('id').limit(1);
  console.log("Likes table fetch result:", error ? error : "Success, found " + data?.length + " rows");
}

test();
