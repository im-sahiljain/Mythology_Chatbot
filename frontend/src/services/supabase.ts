import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://enmrtpqbgtzicdvjasea.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVubXJ0cHFiZ3R6aWNkdmphc2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzgwMTAsImV4cCI6MjA5MzMxNDAxMH0.KGDMpl-HkFuHuB9KSQANmHxVb-ABnoVvQOPK7hef76I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);