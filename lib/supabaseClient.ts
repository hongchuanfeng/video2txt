import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtgvnucqvwdwgbuqssqx.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0Z3ZudWNxdndkd2didXFzc3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjc2NTEsImV4cCI6MjA3OTc0MzY1MX0.OAbdpejgwv92ZrAX_jsZpJlaMWniRsX2iM3uToaaSk8';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL 或 anon key 未配置');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


