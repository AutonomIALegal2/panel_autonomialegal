/* ══════════════════════════════════════════════════════════════════
   main.jsx · Entry del build real (Vite) + puerta de autenticación.
   1) Fija React/ReactDOM como GLOBALES (el resto de archivos los usan bare).
   2) Importa cada módulo POR ORDEN (data → supabase → catálogo → utils →
      hooks → ui → pantallas → app), DESPUÉS de fijar los globales.
   3) app.jsx expone window.App (ya no se auto-monta). Aquí montamos una
      puerta de login: sin sesión → formulario; con sesión → el panel.
   ══════════════════════════════════════════════════════════════════ */
import React from 'react';
import * as ReactDOM from 'react-dom/client';
import './panel.css';

window.React = React;
window.ReactDOM = ReactDOM;

// Orden de carga (supabase y catálogo primero: hooks/lib los usan al evaluar).
await import('./supabase.js');
await import('./catalog.js');
await import('./tweaks-panel.jsx');
await import('./icons.jsx');
await import('./lib.jsx');
await import('./hooks.jsx');
await import('./ui.jsx');
await import('./selectors.jsx');
await import('./screen_dia.jsx');
await import('./lead_drawer.jsx');
await import('./screen_pipeline.jsx');
await import('./screen_lab.jsx');
await import('./screen_embudo.jsx');
await import('./screen_captacion.jsx');
await import('./screen_config.jsx');
await import('./screen_tareas.jsx');
await import('./app.jsx');

const sb = window.sb;

function Login() {
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setErr(error.message);
  }
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg, #070a14)', color: 'var(--text, #eef1fb)', fontFamily: 'Inter, sans-serif' }}>
      <form onSubmit={submit} style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12, padding: 28, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#C9A96E,#a8874c)', fontSize: 18 }}>💰</div>
          <div>
            <div style={{ fontWeight: 750, fontSize: 15 }}>Panel AutonomIA</div>
            <div style={{ fontSize: 11, opacity: .6 }}>Máquina de prospección</div>
          </div>
        </div>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
          style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(0,0,0,.25)', color: 'inherit', font: 'inherit' }} />
        <input type="password" placeholder="Contraseña" value={pw} onChange={(e) => setPw(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(0,0,0,.25)', color: 'inherit', font: 'inherit' }} />
        {err && <div style={{ color: '#ff9b9b', fontSize: 12.5 }}>{err}</div>}
        <button type="submit" disabled={busy}
          style={{ padding: '11px 12px', borderRadius: 9, border: 0, cursor: 'pointer', fontWeight: 700, color: '#1a130a', background: 'linear-gradient(135deg,#C9A96E,#e2c78d)', opacity: busy ? .7 : 1 }}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

function AuthGate() {
  const [session, setSession] = React.useState(undefined); // undefined = cargando
  React.useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (session === undefined) return React.createElement('div', { style: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#070a14', color: '#8891a8', fontFamily: 'Inter,sans-serif' } }, 'Cargando…');
  if (!session) return React.createElement(Login);
  return React.createElement(window.App);
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(AuthGate));
