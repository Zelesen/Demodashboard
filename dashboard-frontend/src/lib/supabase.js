import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log({
  url: supabaseUrl,
  key: supabaseAnonKey?.slice(0,10),
  publishkey: supabasePublishableKey?.slice(0,10)
});

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);