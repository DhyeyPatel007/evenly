import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// NOTE: these two values are public by design — the anon key ships inside
// every client app (web, iOS, Android). Data protection comes from Postgres
// Row Level Security policies, not from hiding this key.
const SUPABASE_URL = 'https://qqwbjjycgpfbsiyopkqa.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxd2JqanljZ3BmYnNpeW9wa3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NTA4NjIsImV4cCI6MjEwNzIyNjg2Mn0.5NA4_X4HlXYWGpAbk4jLwYl4jTyB7VsQeKe8EshF4pI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
