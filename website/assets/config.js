// Plumbline site settings — edit these, then deploy.
// The anon key is safe to publish: Row Level Security in supabase/schema.sql protects the data.
window.PLUMBLINE_CONFIG = {
  SUPABASE_URL: 'https://tzeikixwnqvwrwtwtqvz.supabase.co',        // e.g. 'https://abcdefghijkl.supabase.co'
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6ZWlraXh3bnF2d3J3dHd0cXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5MzkzMDAsImV4cCI6MjEwOTUxNTMwMH0.Lw-05wAPe-zba21nTmnIUYel6SFJP7UYARLaCeod0FQ',   // Supabase dashboard → Project settings → API → anon public key
  SUPPORT_EMAIL: 'support@your-domain.com',
  LABS_EMAIL: 'labs@your-domain.com',
  SITE_URL: ''             // optional, e.g. 'https://plumbline.example.com' — defaults to the current site
};
