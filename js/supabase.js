// Eine einzige Supabase-Client-Instanz für die ganze App.
// Die Bibliothek kommt als ES-Modul vom CDN, mit fest gepinnter Version.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,    // Sitzung im Browser speichern, damit man angemeldet bleibt
    autoRefreshToken: true,  // Zugangstoken automatisch erneuern
  },
});
