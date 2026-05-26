const SUPABASE_URL  = 'https://gbbkcyvzezfducebtgiw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYmtjeXZ6ZXpmZHVjZWJ0Z2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjY2MzMsImV4cCI6MjA5NTMwMjYzM30.DHImov23lKsDiLAz1uGEi-GJ2ASvHtM4SzExdxi2S60';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON);