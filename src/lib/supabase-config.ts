/// <reference types="vite/client" />

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(envUrl && envKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. The app will render a setup screen.'
  );
}

// Export safe fallbacks to prevent Supabase createClient from throwing an error
// before the application can render the visual SetupScreen fallback.
export const supabaseUrl = envUrl || 'https://placeholder.supabase.co';
export const supabaseAnonKey = envKey || 'placeholder-anon-key';
