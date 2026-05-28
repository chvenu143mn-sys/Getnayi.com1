import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function test() {
  const { data, error } = await supabase
    .from('creator_applications')
    .select(`*, profiles (*)`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success apps:', data);
  }
}

test();
