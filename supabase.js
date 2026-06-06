// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════
// This file must be loaded AFTER the Supabase CDN script:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// <script src="supabase.js"></script>

(function() {
  const SUPABASE_URL = 'https://ztevnbvkezwaanrjbsbg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0ZXZuYnZrZXp3YWFucmpic2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODM5ODksImV4cCI6MjA5NTM1OTk4OX0.6QPvWtLp0RR4R5gC67lVDv673PQM1iMhyTIw9vvcYoQ';

  // Wait for Supabase to be available
  if (typeof window.supabase === 'undefined') {
    console.error('❌ ERROR: Supabase CDN not loaded! Add this before supabase.js:');
    console.error('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
    throw new Error('Supabase library not loaded');
  }

  // Create client using window.supabase from CDN
  const { createClient } = window.supabase;
  
  // Create our client instance and expose it globally
  window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.db = window.supabaseClient; // For backward compatibility
  window.supabase = window.supabaseClient; // Override the CDN library with our client
  
  console.log('✅ Supabase client initialized successfully');
})();
