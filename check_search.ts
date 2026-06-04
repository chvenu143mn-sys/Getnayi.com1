import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const queryTerm = "Saree under 1000";
  const fuzzyTerm = queryTerm.replace(/\s+/g, '%');
  
  let { data, error } = await sb
    .from('videos')
    .select('id, caption')
    .ilike('caption', `%${fuzzyTerm}%`)
    .limit(5);
    
  console.log("Fuzzy match:", data, error);
  
  // Try text search
  let tsearch = await sb.from('videos').select('id, caption').textSearch('caption', queryTerm, { type: 'websearch' });
  console.log("Text search:", tsearch.data, tsearch.error);
}
run();
