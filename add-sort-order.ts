import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  // If rpc exec_sql isn't available, we may just not be able to alter the database via script,
  // but looking around we might be able to add the column, however we don't have exec_sql.
  // Actually, wait, let's see if we can do an insert to a non-existent column, it will error.
  const { data, error } = await supabaseAdmin.from('categories').select('sort_order').limit(1);
  console.log('Select sort_order:', error ? error.message : 'Success');
}

run();
