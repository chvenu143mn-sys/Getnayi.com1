import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('videos').select('trust_score').limit(1);
  if (error) {
    console.log("Column might not exist, creating it...");
    // Let's create a SQL function and call it?
    // Wait, with Supabase SDK we can't easily run arbitrary SQL unless we use postgres or rpc.
    // If the user already set up supabase, maybe they can execute database.sql?
    // But maybe I can just update the code to handle `trust_score == null` as 100?
  } else {
      console.log('Column exists.', data);
  }
}
run();
