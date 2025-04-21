import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error('Invalid Supabase URL format');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage, // Explicitly set storage to localStorage
    storageKey: 'supabase.auth.token', // Specify the storage key
    detectSessionInUrl: true, // Enable session detection in URL
    flowType: 'pkce', // Use PKCE flow for better security
  },
});

// Add event listener for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear local storage on sign out
    localStorage.removeItem('supabase.auth.token');
  } else if (event === 'SIGNED_IN' && session) {
    // Ensure the session is properly stored
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
  } else if (event === 'TOKEN_REFRESHED' && session) {
    // Handle token refresh
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
  } else if (event === 'USER_DELETED' || event === 'TOKEN_REFRESH_FAILED') {
    // Handle authentication errors
    supabase.auth.signOut();
    window.location.href = '/auth';
  }
});