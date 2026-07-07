/* ══════════════════════════════════════════════════════════════════
   lib.jsx · utilidades puras (sin estado) + celebración canvas.
   Fechas en Europa/Madrid; el "día" corta a medianoche local.
   ══════════════════════════════════════════════════════════════════ */

const TODAY = PDATA.TODAY;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* dinero: estilo legal español, punto de millar */
function fmtEur(n) {
  if (n == null || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('es-ES') + ' €';
}
function fmtNum(n) { return (n || 0).toLocaleString('es-ES'); }
function fmtPct(n, d = 0) { return (n == null || isNaN(n)) ? '—' : `${n.toFixed(d).replace('.', ',')} %`; }

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${+d} ${MESES[+m - 1]}`;
}
function fmtDateY(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${+d} ${MESES[+m - 1]} ${y}`;
}
/* días naturales entre iso y hoy (negativo = pasado) */
function daysFromToday(iso) {
  if (!iso) return null;
  const a = new Date(iso + 'T00:00:00'), b = new Date(TODAY + 'T00:00:00');
  return Math.round((a - b) / 86400000);
}
function daysBetween(isoA, isoB) {
  const a = new Date(isoA + 'T00:00:00'), b = new Date(isoB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
/* antigüedad legible: "hoy", "ayer", "hace 3 d" */
function ageLabel(iso) {
  const d = daysFromToday(iso);
  if (d == null) return '—';
  if (d === 0) return 'hoy';
  if (d === -1) return 'ayer';
  if (d < 0) return `hace ${-d} d`;
  if (d === 1) return 'mañana';
  return `en ${d} d`;
}
function fmtTs(ts) {
  if (!ts) return '';
  const [date, time] = ts.split(' ');
  if (date === TODAY) return `hoy · ${time}`;
  if (date === PDATA.dayOffset(-1)) return `ayer · ${time}`;
  return `${fmtDate(date)} · ${time || ''}`.trim();
}

/* madurez del lead (cosecha) por etapa */
function maturity(stage) {
  const e = PDATA.etapa(stage);
  return { emoji: e ? e.emoji : '🌱', label: e ? e.name : '' };
}

/* ── z-test de dos proporciones (una cola → devolvemos p a dos colas) ── */
function zTwoProp(x1, n1, x2, n2) {
  if (!n1 || !n2) return { z: 0, p: 1 };
  const p1 = x1 / n1, p2 = x2 / n2;
  const p = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (se === 0) return { z: 0, p: 1 };
  const z = (p1 - p2) / se;
  return { z, p: 2 * (1 - normCdf(Math.abs(z))) };
}
function normCdf(x) {
  // aproximación de Abramowitz & Stegun
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
/* semáforo de significancia A/B */
function abSignificance(a, b) {
  // a,b: { enviados, madurados, respuestas } → usamos positive reply rate sobre madurados
  const n1 = a.madurados, n2 = b.madurados;
  const x1 = a.positivas, x2 = b.positivas;
  const { z, p } = zTwoProp(x1, n1, x2, n2);
  const enough = n1 >= 50 && n2 >= 50;
  let tier;
  if (enough && p < 0.10) tier = 'fiable';
  else if (p < 0.25 && n1 >= 20 && n2 >= 20) tier = 'tendencia';
  else tier = 'insuficiente';
  return { z, p, tier, enough };
}
const SIG_META = {
  fiable:       { dot: '🟢', label: 'Fiable', color: 'var(--green)' },
  tendencia:    { dot: '🟡', label: 'Tendencia', color: 'var(--amber)' },
  insuficiente: { dot: '⚪', label: 'Insuficiente', color: 'var(--text-3)' },
};

/* rate helper */
const rate = (x, n) => n ? (100 * x / n) : 0;

/* ── Celebración: confeti dorado + monedas (canvas, ~2.5s) ── */
let _confettiRunning = false;
function celebrate(kind = 'cliente') {
  if (typeof document === 'undefined') return;
  if (window.__panelHumor === false) return;
  if (_confettiRunning) return;
  _confettiRunning = true;
  const cv = document.createElement('canvas');
  cv.id = 'confetti-canvas';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize();
  const N = kind === 'cliente' ? 150 : 70;
  const golds = ['#C9A96E', '#e2c78d', '#a8874c', '#f0dca3', '#3BA55D', '#5fca80'];
  const parts = [];
  for (let i = 0; i < N; i++) {
    const coin = Math.random() < 0.28;
    parts.push({
      x: innerWidth * (0.3 + Math.random() * 0.4),
      y: innerHeight * 0.35 + (Math.random() - 0.5) * 80,
      vx: (Math.random() - 0.5) * 11,
      vy: -9 - Math.random() * 9,
      g: 0.28 + Math.random() * 0.14,
      size: coin ? 15 + Math.random() * 8 : 6 + Math.random() * 6,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
      color: golds[i % golds.length], coin,
      life: 1,
    });
  }
  const start = performance.now();
  const dur = 2600;
  function frame(t) {
    const el = t - start;
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach((p) => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vx *= 0.99;
      if (el > dur - 700) p.life = Math.max(0, (dur - el) / 700);
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.coin) {
        ctx.font = `${p.size + 6}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🪙', 0, 0);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    });
    if (el < dur) requestAnimationFrame(frame);
    else { cv.remove(); _confettiRunning = false; }
  }
  requestAnimationFrame(frame);
  window.addEventListener('resize', resize, { once: true });
}

/* frase aleatoria de una lista */
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

Object.assign(window, {
  TODAY, MESES, fmtEur, fmtNum, fmtPct, fmtDate, fmtDateY,
  daysFromToday, daysBetween, ageLabel, fmtTs, maturity,
  zTwoProp, abSignificance, SIG_META, rate, celebrate, randomFrom,
});
