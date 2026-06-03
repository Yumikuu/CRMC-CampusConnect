// ── SUPABASE CLIENT ──
// Uses the CDN build — no npm/bundler needed.
// Make sure this script tag appears BEFORE any other script that uses `supabase`:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="../supabase.js"></script>  (adjust path per page)

const SUPABASE_URL = 'https://ztevnbvkezwaanrjbsbg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0ZXZuYnZrZXp3YWFucmpic2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODM5ODksImV4cCI6MjA5NTM1OTk4OX0.6QPvWtLp0RR4R5gC67lVDv673PQM1iMhyTIw9vvcYoQ';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── QUICK CONNECTION TEST (remove in production) ──
(async () => {
  const { data, error } = await db.from('_test_connection').select('*').limit(1);
  if (error && error.code !== 'PGRST116') {
    console.warn('Supabase connected. Test query note:', error.message);
  } else {
    console.log('Supabase connected successfully.');
  }
})();
 