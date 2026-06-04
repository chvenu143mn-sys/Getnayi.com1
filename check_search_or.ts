import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const queryTerm = "Saree under 1000";
  const terms = queryTerm.split(/\s+/).filter(w => w.length > 1);
  const orConditions: string[] = [];
  
  for (const term of terms) {
    orConditions.push(`caption.ilike.%${term}%`);
    orConditions.push(`profiles.username.ilike.%${term}%`);
  }
  
  const orQuery = orConditions.join(',');
  console.log("OR Query:", orQuery);

  let { data, error } = await sb
    .from('videos')
    .select('id, caption, profiles!inner(id, username)')
    .or(orQuery)
    .limit(10);
    
  console.log("Search results:", data, error);
}
run();
