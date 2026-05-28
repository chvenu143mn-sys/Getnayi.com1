import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data: cat } = await supabaseAdmin.from('categories').select('*').limit(1).single();
  if (cat) {
    const { error } = await supabaseAdmin.from('categories').update({ created_at: cat.created_at }).eq('id', cat.id);
    console.log('Update created_at:', error ? error.message : 'Success');
  }
}

run();
