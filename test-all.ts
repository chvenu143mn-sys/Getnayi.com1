import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  const { count } = await supabaseAdmin
    .from('creator_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
    
  console.log('Count pending (admin):', count);
  
  const { data } = await supabaseAdmin
    .from('creator_applications')
    .select('*, profiles (*)')
    .eq('status', 'pending');
    
  console.log('Data pending (admin):', data);
}

test();
