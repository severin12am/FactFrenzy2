import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwursdathnpwsiztdxzu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dXJzZGF0aG5wd3NpenRkeHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3MjU5NzUsImV4cCI6MjA1NzMwMTk3NX0.P-LZ51W23JX1h3L1bOQ3inpJ68MtxogRdCB18aEBlfg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
