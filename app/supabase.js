/* ══════════════════════════════════════════════════════════════════
   supabase.js · Cliente único de Supabase (desde variables de entorno).
   Se expone en window.sb para que hooks.jsx (estilo global) lo use.
   ══════════════════════════════════════════════════════════════════ */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('[panel] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el entorno.');
}

export const sb = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});

window.sb = sb;
