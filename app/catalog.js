/* ══════════════════════════════════════════════════════════════════
   catalog.js · Configuración de dominio (reemplaza a data.js).
   SIN datos mock: los leads/ciclos/config vienen de Supabase (hooks.jsx).
   `TODAY` es HOY REAL en Europa/Madrid; el "día" corta a medianoche local.
   Expone window.PDATA con los catálogos + helpers que consumen las pantallas.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  const TZ = 'Europe/Madrid';
  const fmtDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

  const TODAY = fmtDay(new Date());               // 'YYYY-MM-DD' en Madrid

  function dayOffset(n) {
    const d = new Date(TODAY + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function now() {                                 // 'YYYY-MM-DD HH:MM' en Madrid
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = (t) => p.find((x) => x.type === t).value;
    return `${TODAY} ${g('hour')}:${g('minute')}`;
  }

  /* ── Catálogos ── */
  const ETAPAS = [
    { id: 'pendiente', name: 'Pendiente',       short: 'Pendiente',  color: 'var(--st-pend)',   emoji: '🌱' },
    { id: 'm1',        name: 'M1 enviado',       short: 'M1',         color: 'var(--st-m1)',     emoji: '🌿' },
    { id: 'respondio', name: 'Respondió',        short: 'Respondió',  color: 'var(--st-reply)',  emoji: '🌿' },
    { id: 'oferta',    name: 'Oferta enviada',   short: 'Oferta',     color: 'var(--st-oferta)', emoji: '🪴' },
    { id: 'acceso',    name: 'Acceso aceptado',  short: 'Acceso',     color: 'var(--st-acceso)', emoji: '🪴' },
    { id: 'trial',     name: 'Trial activo',     short: 'Trial',      color: 'var(--st-trial)',  emoji: '🌳' },
    { id: 'llamada',   name: 'Llamada agendada', short: 'Llamada',    color: 'var(--st-call)',   emoji: '🌳' },
    { id: 'cliente',   name: 'Cliente',          short: 'Cliente',    color: 'var(--st-cliente)',emoji: '💰', trophy: true },
    { id: 'perdido',   name: 'Perdido',          short: 'Perdido',    color: 'var(--st-perdido)',emoji: '🥀', terminal: true },
    { id: 'nevera',    name: 'Nevera',           short: 'Nevera',     color: 'var(--st-nevera)', emoji: '🧊', terminal: true },
    { id: 'silencio',  name: 'Silencio cerrado', short: 'Silencio',   color: 'var(--st-silencio)',emoji: '🔇', terminal: true },
  ];
  const ETAPA_ORDER = ['pendiente','m1','respondio','oferta','acceso','trial','llamada','cliente'];

  const TEMPS = [
    { id: 'CALIENTE', label: 'Caliente', emoji: '🔥', color: 'var(--hot)',  bg: 'var(--hot-bg)',  fw: 'A' },
    { id: 'TEMPLADO', label: 'Templado', emoji: '🌤️', color: 'var(--warm)', bg: 'var(--warm-bg)', fw: 'B' },
    { id: 'FRIO',     label: 'Frío',     emoji: '❄️', color: 'var(--cold)', bg: 'var(--cold-bg)', fw: 'C' },
  ];

  const VARIANTS = {
    A1: { fw: 'A', angulo: 'Dolor directo',    temp: 'CALIENTE' },
    A2: { fw: 'A', angulo: 'Prueba social',    temp: 'CALIENTE' },
    B1: { fw: 'B', angulo: 'Curiosidad',       temp: 'TEMPLADO' },
    B2: { fw: 'B', angulo: 'Consultiva',       temp: 'TEMPLADO' },
    C1: { fw: 'C', angulo: 'Valor primero',    temp: 'FRIO' },
    C2: { fw: 'C', angulo: 'Reto incómodo',    temp: 'FRIO' },
  };
  const FRAMEWORKS = [
    { id: 'A', label: 'Calientes', temp: 'CALIENTE', a: 'A1', b: 'A2' },
    { id: 'B', label: 'Templados', temp: 'TEMPLADO', a: 'B1', b: 'B2' },
    { id: 'C', label: 'Fríos',     temp: 'FRIO',     a: 'C1', b: 'C2' },
  ];

  const AREAS = ['Laboral', 'Penal', 'Civil', 'Familia', 'Mercantil', 'Extranjería', 'Administrativo', 'Inmobiliario', 'Concursal'];
  const PERFILES = ['Socio/a director/a', 'Abogado/a titular', 'Abogado/a colegiado/a', 'Of counsel', 'Socio/a'];

  const BUMPS_DEFAULT = [
    'Muy buenas {f}! Cómo va todo?\n\nHace unos días te escribí y no sé si llegó a saltarte la notificación 🙂\n\nTe leo cuando tengas un hueco, sin prisa.',
    '{f}, te dejo esto por aquí arriba por si se quedó abajo la conversación 🙌\n\nMe interesa de verdad cómo lo lleváis: los expedientes y los plazos los tenéis en un mismo sitio, o cada cosa por su lado?',
    'Cierro el hilo por no insistir, {f}. Si en algún momento quieres ver cómo tener plazos y expedientes bajo control, aquí me tienes. Un abrazo!',
  ];
  const fillBump = (tpl, f) => tpl.replace(/\{f\}/g, f);
  const OFERTA_TPL = (f) => `Genial ${f}. Te propongo esto: te doy acceso 30 días como «despacho fundador», sin coste y sin tarjeta. Montamos tu despacho dentro juntos y, si te sirve, hablamos de números. Si no, no pasa nada y te llevas el sistema montado. ¿Te paso el acceso?`;

  const FRASES_META = [
    'A cerrar se ha dicho 💰', 'Hoy se factura, primo 🧾', 'El que siembra, cobra 🌾',
    'Máquina de hacer clientes 🤖', 'Otro día currado, otro día más cerca 🚀', 'La pasta no se persigue, se atrae 🧲',
  ];
  const FRASES_VACIO = [
    'Nadie que perseguir hoy. Se caza mañana 🏹', 'Bandeja limpia. Da gusto verte trabajar 😎',
    'Todo en orden por aquí. Respira, jefe 🌬️',
  ];

  window.PDATA = {
    TODAY, dayOffset, now,
    ETAPAS, ETAPA_ORDER, TEMPS, VARIANTS, FRAMEWORKS, AREAS, PERFILES,
    BUMPS_DEFAULT, FRASES_META, FRASES_VACIO, OFERTA_TPL, fillBump,
    byId: (arr, id) => arr.find((x) => x.id === id),
    etapa: (id) => ETAPAS.find((e) => e.id === id),
    temp: (id) => TEMPS.find((t) => t.id === id),
  };
})();
