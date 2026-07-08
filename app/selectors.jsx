/* ══════════════════════════════════════════════════════════════════
   selectors.jsx · derivaciones puras sobre la lista de leads.
   Queues de MI DÍA, embudo, cortes de señales, A/B y munición.
   ══════════════════════════════════════════════════════════════════ */

/* etapas que implican que se envió el M1 */
const SENT_STAGES = new Set(['m1', 'fu1', 'fu2', 'fu3', 'respondio', 'oferta', 'acceso', 'trial', 'llamada', 'cliente', 'silencio', 'nevera', 'perdido']);
/* etapas desde las que aún se hace seguimiento (M1 sin FU, o con FU1/FU2 enviados) */
const FOLLOWUP_STAGES = new Set(['m1', 'fu1', 'fu2']);
const RESPONDED_STAGES = new Set(['respondio', 'oferta', 'acceso', 'trial', 'llamada', 'cliente']);
// avanzó MÁS ALLÁ de "respondió" → implica respuesta positiva (NO incluye 'respondio', que depende de reply_type)
const ADVANCED_STAGES = new Set(['oferta', 'acceso', 'trial', 'llamada', 'cliente']);
const PIPELINE_MONEY_STAGES = new Set(['oferta', 'acceso', 'trial', 'llamada']);

/* pasta en juego = leads en oferta/acceso/trial/llamada × ticket medio */
function pipelineMoney(leads, ticket) {
  const n = leads.filter((l) => PIPELINE_MONEY_STAGES.has(l.stage)).length;
  return { count: n, total: n * ticket };
}

/* ── Colas de MI DÍA ── */
function queues(leads) {
  // Cadencia Hormozi-LinkedIn 2/3/7: FU1 a +2d del M1, FU2 a +3d del FU1, FU3 a +7d del FU2.
  const FU_GAPS = [2, 3, 7];
  const daysSinceTouch = (iso) => (iso == null ? 0 : -daysFromToday(iso));
  const fuDue = (l) => daysSinceTouch(l.ultimoContacto) >= FU_GAPS[Math.min(2, l.fuCount || 0)];
  const enviarAhora = leads.filter((l) => l.stage === 'pendiente')
    .sort((a, b) => a.prioridad - b.prioridad || (a.teInvito === b.teInvito ? 0 : a.teInvito ? -1 : 1));
  const followupsHoy = leads.filter((l) => FOLLOWUP_STAGES.has(l.stage) && (l.fuCount || 0) < 3 && fuDue(l))
    .sort((a, b) => (a.fuCount || 0) - (b.fuCount || 0) || daysFromToday(a.ultimoContacto) - daysFromToday(b.ultimoContacto));
  const esperando = leads.filter((l) => l.stage === 'respondio' && !l.nextStep)
    .sort((a, b) => daysFromToday(a.repliedAt) - daysFromToday(b.repliedAt));
  const neveraDespierta = leads.filter((l) => l.stage === 'nevera' && l.snoozeUntil && daysFromToday(l.snoozeUntil) <= 0);
  // FU3 vencido: mandó FU3 y pasó ≥1 día sin respuesta → sugerir silencio cerrado
  // (cubre también leads históricos que quedaran en m1 con fuCount=3, pre-etapas fu*)
  const fu3Vencidos = leads.filter((l) => (l.stage === 'fu3' || (l.stage === 'm1' && (l.fuCount || 0) >= 3)) && daysFromToday(l.ultimoContacto) <= -1);
  return { enviarAhora, followupsHoy, esperando, neveraDespierta, fu3Vencidos };
}

/* reply rate global: respondieron / M1 enviados (maduros) */
function replyStats(leads) {
  const sent = leads.filter((l) => SENT_STAGES.has(l.stage));
  const replied = leads.filter((l) => RESPONDED_STAGES.has(l.stage) || l.replyType);
  const positives = leads.filter((l) => l.replyType === 'POSITIVA' || ADVANCED_STAGES.has(l.stage));
  return {
    sent: sent.length,
    replied: replied.length,
    positives: positives.length,
    replyRate: rate(replied.length, sent.length),
    positiveRate: rate(positives.length, sent.length),
  };
}

/* munición: días de cola restantes = pendientes / objetivo diario */
function ammoStatus(leads, objetivoDiario, umbral) {
  const pendientes = leads.filter((l) => l.stage === 'pendiente').length;
  const dias = objetivoDiario ? pendientes / objetivoDiario : 0;
  let tier;
  if (dias > 7) tier = 'ok';
  else if (dias >= 4) tier = 'warn';
  else tier = 'crit';
  return { pendientes, dias, tier, low: dias < umbral };
}

/* ── A/B por rama ── */
function abStats(leads, minMature = 7) {
  const out = {};
  Object.keys(PDATA.VARIANTS).forEach((v) => { out[v] = { enviados: 0, madurados: 0, respuestas: 0, positivas: 0 }; });
  leads.forEach((l) => {
    if (l.altered) return;                    // copy alterado → fuera del test
    if (!SENT_STAGES.has(l.stage)) return;
    const v = l.variante; if (!out[v]) return;
    out[v].enviados++;
    const mature = l.m1Date && daysFromToday(l.m1Date) <= -minMature;
    if (mature) out[v].madurados++;
    if (RESPONDED_STAGES.has(l.stage) || l.replyType) out[v].respuestas++;
    if (l.replyType === 'POSITIVA' || ADVANCED_STAGES.has(l.stage)) { if (mature) out[v].positivas++; }
  });
  return out;
}

/* ── A/B de FOLLOW-UPS (por toque) ──
   Cada FU enviado lleva su formato en el type del mensaje ('FU1·A' / 'FU2·B').
   Un formato se apunta la respuesta si fue el ÚLTIMO toque antes de que el
   lead respondiera. Los FU antiguos sin sufijo (pre-test) quedan fuera. */
function fuAbStats(leads) {
  const mk = () => ({ enviados: 0, respuestas: 0 });
  const out = { A: mk(), B: mk() };
  const porToque = {};   // 'FU1·A' → {enviados, respuestas}
  leads.forEach((l) => {
    const fus = (l.messages || []).filter((m) => /^FU\d·[AB]$/.test(String(m.type)));
    if (!fus.length) return;
    fus.forEach((m) => {
      const v = m.type.slice(-1);
      out[v].enviados++;
      (porToque[m.type] = porToque[m.type] || mk()).enviados++;
    });
    const responded = RESPONDED_STAGES.has(l.stage) || l.replyType;
    if (responded) {
      const last = fus[fus.length - 1];
      const v = last.type.slice(-1);
      out[v].respuestas++;
      porToque[last.type].respuestas++;
    }
  });
  const withRate = (o) => ({ ...o, rate: rate(o.respuestas, o.enviados) });
  return {
    A: withRate(out.A), B: withRate(out.B),
    porToque: Object.entries(porToque).sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ key: k, ...withRate(v) })),
  };
}

/* respuesta según nº de toque (a la 1ª / tras FU1 / FU2 / FU3) */
function touchBreakdown(leads) {
  // usamos fuCount en el momento de responder (aprox: los que respondieron con N follow-ups previos)
  const buckets = [0, 0, 0, 0];   // índice = nº de FU antes de responder
  const totals = [0, 0, 0, 0];
  leads.forEach((l) => {
    if (!SENT_STAGES.has(l.stage)) return;
    const fu = Math.min(3, l.fuCount || 0);
    totals[fu]++;
    if (RESPONDED_STAGES.has(l.stage) || l.replyType) buckets[fu]++;
  });
  return buckets.map((b, i) => ({ touch: i, replied: b, total: totals[i], rate: rate(b, totals[i]) }));
}

/* ── Embudo ── */
const FUNNEL_STEPS = [
  { key: 'm1',       label: 'M1 enviado' },
  { key: 'reply',    label: 'Respondió' },
  { key: 'positive', label: 'Positiva' },
  { key: 'oferta',   label: 'Oferta' },
  { key: 'acceso',   label: 'Acceso' },
  { key: 'trial',    label: 'Trial' },
  { key: 'llamada',  label: 'Llamada' },
  { key: 'cliente',  label: 'Cliente' },
];
function funnel(leads) {
  const atLeast = (stage) => leads.filter((l) => reached(l, stage)).length;
  const counts = {
    m1: leads.filter((l) => SENT_STAGES.has(l.stage)).length,
    reply: leads.filter((l) => RESPONDED_STAGES.has(l.stage) || l.replyType).length,
    positive: leads.filter((l) => l.replyType === 'POSITIVA' || ADVANCED_STAGES.has(l.stage)).length,
    oferta: atLeast('oferta'), acceso: atLeast('acceso'), trial: atLeast('trial'),
    llamada: atLeast('llamada'), cliente: atLeast('cliente'),
  };
  return FUNNEL_STEPS.map((s, i) => {
    const n = counts[s.key];
    const prev = i ? counts[FUNNEL_STEPS[i - 1].key] : n;
    return { ...s, n, pct: i ? rate(n, prev) : 100, ofTop: rate(n, counts.m1) };
  });
}
function reached(l, stage) {
  const order = PDATA.ETAPA_ORDER;
  const li = order.indexOf(l.stage), si = order.indexOf(stage);
  if (li === -1) return false;         // terminales (perdido/nevera/silencio) no cuentan como avance
  return li >= si;
}

/* cortes de positive reply rate por dimensión */
function cutBy(leads, keyFn) {
  const map = {};
  leads.forEach((l) => {
    if (!SENT_STAGES.has(l.stage)) return;
    const k = keyFn(l); if (k == null) return;
    (map[k] = map[k] || { n: 0, pos: 0 });
    map[k].n++;
    if (l.replyType === 'POSITIVA' || ADVANCED_STAGES.has(l.stage)) map[k].pos++;
  });
  return Object.entries(map).map(([k, v]) => ({ key: k, n: v.n, rate: rate(v.pos, v.n) }))
    .sort((a, b) => b.rate - a.rate);
}

Object.assign(window, {
  SENT_STAGES, FOLLOWUP_STAGES, RESPONDED_STAGES, ADVANCED_STAGES, PIPELINE_MONEY_STAGES,
  pipelineMoney, queues, replyStats, ammoStatus, abStats, fuAbStats, touchBreakdown,
  FUNNEL_STEPS, funnel, reached, cutBy,
});
