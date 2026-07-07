# Panel AutonomIA — CRM de prospección

CRM personal de prospección 1:1 por LinkedIn (single-user). React 18 + Vite + Supabase.
Diseño de Claude Design, backend Supabase (proyecto `xhqlbntdertmzadgcyzo`).

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y rellena las dos variables (abajo)
npm run dev                  # http://localhost:5175
```

## Variables de entorno (2)

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://xhqlbntdertmzadgcyzo.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | la **anon / publishable key** del proyecto (Supabase → Project Settings → API Keys) |

> La anon key es **pública por diseño** (va en el bundle del navegador). La seguridad la da el RLS + login: solo entra tu usuario, y los registros nuevos están desactivados.

## Deploy en Vercel

1. Sube este repo a GitHub.
2. En Vercel → **New Project** → importa el repo. Framework: **Vite** (autodetectado).
3. En **Environment Variables** añade las dos de arriba (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
4. **Deploy.** Vercel corre `npm install` + `npm run build` y sirve `dist/`.
5. (Opcional) Configura tu **subdominio** en Vercel → Settings → Domains.

## Acceso

- La app exige **login** (email + contraseña del usuario creado en Supabase → Authentication → Users).
- Registros nuevos: **desactivados** en Supabase (Auth → Providers → Email → *Allow new users to sign up* = off).

## Estructura

- `index.html` + `app/main.jsx` — entry (fija React global, importa módulos en orden, monta la puerta de login).
- `app/supabase.js` — cliente Supabase (desde env).
- `app/catalog.js` — catálogos de dominio + hoy real en Europa/Madrid.
- `app/hooks.jsx` — capa de datos (lectura + mutaciones optimistas con persistencia por lead).
- `app/selectors.jsx` — colas de Mi Día (cadencia de follow-ups 2/3/7), embudo, A/B.
- `app/screen_*.jsx`, `app/lead_drawer.jsx`, `app/ui.jsx` — vistas y componentes.
- `app/panel.css` — todos los tokens y estilos (temas claro/oscuro).
