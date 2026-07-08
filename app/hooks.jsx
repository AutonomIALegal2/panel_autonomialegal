/* ══════════════════════════════════════════════════════════════════
   hooks.jsx · CAPA DE DATOS (Supabase). Mismas firmas que el mock:
   los componentes no se enteran del cambio. Estrategia:
   - lectura al montar → arma los leads con su shape anidado (messages/events/captures)
   - mutaciones: actualización OPTIMISTA en local + persistencia en segundo plano
     (upsert de escalares del lead + resync de hijos de ese lead).
   Fechas: la BD guarda timestamptz/date; el panel usa 'YYYY-MM-DD' y
   'YYYY-MM-DD HH:MM'. Los mappers convierten en ambos sentidos (TZ Madrid).
   ══════════════════════════════════════════════════════════════════ */
const { useState: uS, useEffect: uE, useCallback: uC, useRef: uR } = React;
const sb = window.sb;
const TZ = 'Europe/Madrid';

/* ── helpers de fecha ── */
function tsToDate(v) {                    // → 'YYYY-MM-DD' (Madrid) | null
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d)) return typeof v === 'string' ? v.slice(0, 10) : null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function tsToStamp(v) {                    // → 'YYYY-MM-DD HH:MM' (Madrid)
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}`;
}
const dateOrNull = (s) => (s ? s : null);                       // 'YYYY-MM-DD' → Postgres lo parsea
const stampToTs = (s) => {                                      // 'YYYY-MM-DD HH:MM' → ISO (interpretado en TZ del navegador = Madrid)
  if (!s) return new Date().toISOString();
  const d = new Date(String(s).replace(' ', 'T'));
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
};

/* ── error visible (un CRM no puede fallar en silencio) ── */
function flagError(msg) {
  console.error('[panel]', msg);
  try {
    let el = document.getElementById('panel-persist-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'panel-persist-error';
      el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;background:#7a1020;color:#fff;padding:10px 16px;border-radius:10px;font:600 13px/1.3 Inter,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5);max-width:90vw';
      document.body.appendChild(el);
    }
    el.textContent = '⚠️ ' + msg;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.remove(), 6000);
  } catch (e) {}
}

/* ── mappers fila BD ↔ shape del panel ── */
function mapMsg(m) { return { id: m.id, type: m.tipo, suggested: m.texto_sugerido, sent: m.texto_enviado, altered: m.editado, date: tsToStamp(m.enviado_en || m.created_at) }; }
function mapEvt(e) { return { ts: tsToStamp(e.ts), kind: e.kind, text: e.text }; }
function mapCap(c) { return { id: c.id, src: c._src || null, w: c.w, h: c.h, at: tsToDate(c.created_at), _path: c.storage_path }; }

function rowToLead(r, kids) {
  return {
    id: r.id, prioridad: r.prioridad, nombre: r.nombre, tipo: r.tipo, pais: r.pais, ciudad: r.ciudad,
    perfil: r.perfil, area: r.area, temperatura: r.temperatura, framework: r.framework, variante: r.variante,
    angulo: r.angulo, ultimoContacto: tsToDate(r.ultimo_contacto), teInvito: r.te_invito, conectoEl: tsToDate(r.conecto_el),
    url: r.url, mensaje: r.mensaje, stage: r.stage, fuCount: r.fu_count, replyType: r.reply_type,
    origen: r.origen || 'linkedin', origenDetalle: r.origen_detalle,
    repliedAt: tsToDate(r.replied_at), m1Date: tsToDate(r.m1_date), altered: r.altered, qualif: r.qualif,
    nextStep: r.next_step, snoozeUntil: tsToDate(r.snooze_until), lostReason: r.lost_reason, notas: r.notas,
    messages: kids.msgs, events: kids.evts, captures: kids.caps,
  };
}
function leadToRow(l) {
  return {
    id: l.id, prioridad: l.prioridad ?? 3, nombre: l.nombre, tipo: l.tipo || null, pais: l.pais || 'España', ciudad: l.ciudad || null,
    perfil: l.perfil || null, area: l.area || null, temperatura: l.temperatura || null, framework: l.framework || null, variante: l.variante || null,
    angulo: l.angulo || null, ultimo_contacto: dateOrNull(l.ultimoContacto), te_invito: !!l.teInvito, conecto_el: dateOrNull(l.conectoEl),
    url: l.url || null, mensaje: l.mensaje || null, stage: l.stage || 'pendiente', fu_count: l.fuCount || 0, reply_type: l.replyType || null,
    origen: l.origen || 'linkedin', origen_detalle: l.origenDetalle || null,
    replied_at: dateOrNull(l.repliedAt), m1_date: dateOrNull(l.m1Date), altered: !!l.altered, qualif: l.qualif || null,
    next_step: l.nextStep || null, snooze_until: dateOrNull(l.snoozeUntil), lost_reason: l.lostReason || null, notas: l.notas || null,
  };
}
const msgToRow = (leadId, m) => ({ lead_id: leadId, tipo: m.type, texto_sugerido: m.suggested ?? null, texto_enviado: m.sent ?? null, enviado_en: stampToTs(m.date) });
const evtToRow = (leadId, e) => ({ lead_id: leadId, ts: stampToTs(e.ts), kind: e.kind || 'stage', text: e.text || null });

/* ── cola de escritura SERIALIZADA por lead.id ──────────────────────────
   Dos mutaciones rápidas del MISMO lead (p.ej. mover a «oferta» y acto
   seguido «Deshacer») se lanzaban en paralelo sin await; el orden de llegada
   a la BD no estaba garantizado y a veces ganaba la primera → el lead se
   quedaba en un estado que NO era el último elegido (de ahí el «Deshacer»
   que no deshacía y el KPI «Pasta en juego» que no se descontaba).
   Encadenando por id, la ÚLTIMA acción en el tiempo es la última en escribir. */
const _writeQ = {};
function enqueueWrite(id, task) {
  const run = (_writeQ[id] || Promise.resolve()).then(task, task); // corre pase lo que pase
  _writeQ[id] = run.finally(() => { if (_writeQ[id] === run) delete _writeQ[id]; });
  return _writeQ[id];
}

/* ¿cambió el lead respecto al anterior? (escalares del row o nº de hijos) */
function leadChanged(p, l) {
  if (!p) return true;
  if (JSON.stringify(leadToRow(p)) !== JSON.stringify(leadToRow(l))) return true;
  return (p.messages || []).length !== (l.messages || []).length
      || (p.events || []).length !== (l.events || []).length;
}

/* ── persistencia de un lead: escalares + resync de hijos (mensajes/eventos) ── */
function persistLead(lead) {
  return enqueueWrite(lead.id, async () => {
    try {
      const { error: e1 } = await sb.from('leads').upsert(leadToRow(lead), { onConflict: 'id' });
      if (e1) throw e1;
      await sb.from('lead_messages').delete().eq('lead_id', lead.id);
      if (lead.messages && lead.messages.length) {
        const { error } = await sb.from('lead_messages').insert(lead.messages.map((m) => msgToRow(lead.id, m)));
        if (error) throw error;
      }
      await sb.from('lead_events').delete().eq('lead_id', lead.id);
      if (lead.events && lead.events.length) {
        const { error } = await sb.from('lead_events').insert(lead.events.map((e) => evtToRow(lead.id, e)));
        if (error) throw error;
      }
    } catch (e) { flagError('No se pudo guardar ' + (lead.nombre || lead.id) + ': ' + (e.message || e)); }
  });
}

/* ══════════════════════ useLeads ══════════════════════ */
function useLeads() {
  const [leads, setLeadsState] = uS([]);
  const leadsRef = uR([]);
  const setLeads = uC((updater) => {
    setLeadsState((prev) => { const next = typeof updater === 'function' ? updater(prev) : updater; leadsRef.current = next; return next; });
  }, []);

  uE(() => { loadAll(); }, []);
  async function loadAll() {
    const [lr, mr, er, cr] = await Promise.all([
      sb.from('leads').select('*').order('prioridad', { ascending: true }),
      sb.from('lead_messages').select('*'),
      sb.from('lead_events').select('*').order('ts', { ascending: false }),
      sb.from('lead_captures').select('*'),
    ]);
    if (lr.error) { flagError('Error cargando leads: ' + lr.error.message); return; }
    const kids = {};
    const K = (id) => (kids[id] || (kids[id] = { msgs: [], evts: [], caps: [] }));
    (mr.data || []).forEach((m) => K(m.lead_id).msgs.push(mapMsg(m)));
    (er.data || []).forEach((e) => K(e.lead_id).evts.push(mapEvt(e)));
    (cr.data || []).forEach((c) => K(c.lead_id).caps.push(mapCap(c)));
    // mensajes por fecha ascendente para la ficha
    Object.values(kids).forEach((k) => k.msgs.sort((a, b) => (a.date < b.date ? -1 : 1)));
    let assembled = (lr.data || []).map((r) => rowToLead(r, kids[r.id] || { msgs: [], evts: [], caps: [] }));
    // Migración one-shot (8-jul, etapas fu1/fu2/fu3): los leads que ya tenían
    // follow-ups enviados vivían en 'm1' con fuCount>0 → se recolocan en su
    // etapa FU real y se persisten. Tras la primera carga es un no-op.
    const toMigrate = assembled.filter((l) => l.stage === 'm1' && (l.fuCount || 0) > 0);
    if (toMigrate.length) {
      assembled = assembled.map((l) => (l.stage === 'm1' && (l.fuCount || 0) > 0)
        ? { ...l, stage: `fu${Math.min(3, l.fuCount)}` } : l);
      assembled.filter((l) => /^fu\d$/.test(l.stage)).forEach((l) => {
        if (toMigrate.find((m) => m.id === l.id)) persistLead(l);
      });
    }
    setLeads(assembled);
  }

  const patchLead = uC((id, patch, evt) => {
    setLeads((prev) => {
      const next = prev.map((l) => {
        if (l.id !== id) return l;
        const merged = { ...l, ...(typeof patch === 'function' ? patch(l) : patch) };
        if (evt) merged.events = [{ ts: window.PDATA.now(), ...evt }, ...(l.events || [])];
        return merged;
      });
      const changed = next.find((l) => l.id === id);
      if (changed) persistLead(changed);
      return next;
    });
  }, [setLeads]);

  const setStage = uC((id, stage, evt) => {
    patchLead(id, { stage }, evt || { kind: 'stage', text: `Movido a «${window.PDATA.etapa(stage).name}»` });
  }, [patchLead]);

  const addMessage = uC((id, msg) => {
    patchLead(id, (l) => ({ messages: [...(l.messages || []), msg] }),
      { kind: msg.type === 'Oferta' ? 'offer' : (String(msg.type).startsWith('FU') ? 'fu' : 'sent'), text: `${msg.type} enviado` });
  }, [patchLead]);

  const addCapture = uC(async (id, cap) => {
    let path = null, src = cap && cap.src ? cap.src : null;
    try {
      if (cap && cap.src && String(cap.src).startsWith('data:')) {
        const blob = await (await fetch(cap.src)).blob();
        path = `${id}/${Date.now()}.png`;
        const up = await sb.storage.from('capturas').upload(path, blob, { contentType: blob.type || 'image/png', upsert: true });
        if (up.error) throw up.error;
        const signed = await sb.storage.from('capturas').createSignedUrl(path, 60 * 60 * 24 * 365);
        src = signed.data ? signed.data.signedUrl : cap.src;
        const { error } = await sb.from('lead_captures').insert({ lead_id: id, storage_path: path, w: cap.w || null, h: cap.h || null });
        if (error) throw error;
      }
    } catch (e) { flagError('No se pudo guardar la captura: ' + (e.message || e)); }
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, captures: [...(l.captures || []), { ...cap, src, _path: path }] } : l));
  }, [setLeads]);

  const addLead = uC((lead) => {
    setLeads((prev) => [lead, ...prev]);
    persistLead({ messages: [], events: [], ...lead });
  }, [setLeads]);

  const deleteLead = uC((id) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    (async () => {
      try { const { error } = await sb.from('leads').delete().eq('id', id); if (error) throw error; }
      catch (e) { flagError('No se pudo eliminar el lead: ' + (e.message || e)); }
    })();
  }, [setLeads]);

  const replaceAll = uC((next) => {
    const prev = leadsRef.current;
    setLeads(next);
    // Persistimos SOLO los leads que cambiaron, cada uno por la MISMA cola
    // serializada de persistLead (nada de upsert masivo suelto que compita con
    // las escrituras por-lead: esa carrera era la que rompía el «Deshacer»).
    const prevById = Object.fromEntries((prev || []).map((l) => [l.id, l]));
    for (const l of next) {
      if (leadChanged(prevById[l.id], l)) persistLead(l);
    }
  }, [setLeads]);

  return { leads, setLeads, patchLead, setStage, addMessage, addCapture, addLead, deleteLead, replaceAll };
}

/* ══════════════════════ useConfig ══════════════════════ */
const CONFIG_DEFAULT = { objetivoDiario: 40, ticketMedio: 50, umbralMunicion: 3, bumps: window.PDATA.BUMPS_DEFAULT.slice(), bumpsB: window.PDATA.BUMPS_B_DEFAULT.slice(), humor: true, theme: 'dark' };
/* La columna jsonb `bumps` de panel_config lleva las DOS series del test A/B:
   [0..2] = serie A, [3..5] = serie B. Retrocompatible: si en BD hay solo 3
   (formato viejo), esas son la A y la B sale de los defaults. Sin ALTER TABLE. */
const cfgToRow = (c) => ({ id: 1, objetivo_diario: c.objetivoDiario, ticket_medio: c.ticketMedio, umbral_municion: c.umbralMunicion, bumps: [...c.bumps, ...c.bumpsB], humor: c.humor, theme: c.theme });
const rowToCfg = (r) => {
  const arr = (r.bumps && r.bumps.length) ? r.bumps : [];
  const bumpsB = arr.length >= 6 ? arr.slice(3, 6) : window.PDATA.BUMPS_B_DEFAULT.slice();
  // Migración suave (8-jul): si la BD guardó la plantilla B1 antigua («…domado?»),
  // se sustituye por la redacción nueva de Pablo sin tocar sus otras ediciones.
  if (bumpsB[0] && bumpsB[0].includes('domado')) bumpsB[0] = window.PDATA.BUMPS_B_DEFAULT[0];
  return {
    objetivoDiario: r.objetivo_diario, ticketMedio: Number(r.ticket_medio), umbralMunicion: r.umbral_municion,
    bumps: arr.length >= 3 ? arr.slice(0, 3) : window.PDATA.BUMPS_DEFAULT.slice(),
    bumpsB,
    humor: r.humor, theme: r.theme,
  };
};

function useConfig() {
  const [config, setConfigState] = uS(CONFIG_DEFAULT);
  const ref = uR(CONFIG_DEFAULT);
  uE(() => {
    (async () => {
      const { data } = await sb.from('panel_config').select('*').eq('id', 1).maybeSingle();
      if (data) { const c = rowToCfg(data); ref.current = c; setConfigState(c); }
    })();
  }, []);
  const setConfig = uC((patch) => {
    setConfigState((prev) => {
      const next = { ...prev, ...patch }; ref.current = next;
      sb.from('panel_config').upsert(cfgToRow(next), { onConflict: 'id' }).then(({ error }) => { if (error) flagError('No se pudo guardar la config: ' + error.message); });
      return next;
    });
  }, []);
  uE(() => { window.__panelHumor = config.humor; }, [config.humor]);
  return [config, setConfig];
}

/* ══════════════════════ useCycles ══════════════════════ */
function useCycles() {
  const [cycles, setCyclesState] = uS([]);
  uE(() => { (async () => {
    const { data } = await sb.from('invite_cycles').select('*').order('fecha', { ascending: false });
    if (data) setCyclesState(data.map((c) => ({ id: c.id, fecha: tsToDate(c.fecha), recomendados: c.recomendados, enviadas: c.enviadas, aceptadas: c.aceptadas, importados: c.importados, nota: c.nota })));
  })(); }, []);
  const addCycle = uC((c) => {
    setCyclesState((cs) => [{ ...c }, ...cs]);
    sb.from('invite_cycles').insert({ fecha: dateOrNull(c.fecha) || window.PDATA.TODAY, recomendados: c.recomendados || 0, enviadas: c.enviadas || 0, aceptadas: c.aceptadas || 0, importados: c.importados || 0, nota: c.nota || null })
      .then(({ error }) => { if (error) flagError('No se pudo guardar el ciclo: ' + error.message); });
  }, []);
  return { cycles, addCycle, setCycles: setCyclesState };
}

/* ══════════════════════ useBitacora ══════════════════════ */
function useBitacora() {
  const [notes, setNotesState] = uS([]);
  uE(() => { (async () => {
    const { data } = await sb.from('panel_bitacora').select('*').order('fecha', { ascending: false });
    if (data) setNotesState(data.map((n) => ({ id: n.id, fecha: tsToDate(n.fecha), texto: n.texto })));
  })(); }, []);
  const addNote = uC((texto) => {
    const optimistic = { id: 'tmp' + Math.random(), fecha: window.PDATA.TODAY, texto };
    setNotesState((ns) => [optimistic, ...ns]);
    sb.from('panel_bitacora').insert({ fecha: window.PDATA.TODAY, texto }).then(({ error }) => { if (error) flagError('No se pudo guardar la nota: ' + error.message); });
  }, []);
  return { notes, addNote };
}

/* ══════════════════════ useDaily ══════════════════════ */
function useDaily() {
  const [daily, setDailyState] = uS({ date: window.PDATA.TODAY, sent: 0, streak: 0, lastHit: null, history: {} });
  const ref = uR(daily);
  const save = (d) => { ref.current = d; sb.from('panel_daily').upsert({ date: d.date, sent: d.sent, streak: d.streak, last_hit: d.lastHit || null, history: d.history || {} }, { onConflict: 'date' }).then(({ error }) => { if (error) flagError('No se pudo guardar el contador: ' + error.message); }); };
  uE(() => { (async () => {
    const today = window.PDATA.TODAY;
    const { data } = await sb.from('panel_daily').select('*').eq('date', today).maybeSingle();
    if (data) { const d = { date: data.date, sent: data.sent, streak: data.streak, lastHit: data.last_hit, history: data.history || {} }; ref.current = d; setDailyState(d); }
    else { const d = { date: today, sent: 0, streak: 0, lastHit: null, history: {} }; ref.current = d; setDailyState(d); save(d); }
  })(); }, []);
  const setDaily = uC((patch) => { setDailyState((prev) => { const next = { ...prev, ...patch }; save(next); return next; }); }, []);
  const bump = uC((n = 1) => { setDailyState((prev) => { const next = { ...prev, sent: Math.max(0, prev.sent + n) }; save(next); return next; }); }, []);
  return { daily, setDaily, bump };
}

/* ══════════════════════ useTasks (tareas de captación) ══════════════════════ */
function useTasks() {
  const [tasks, setTasksState] = uS([]);
  uE(() => { (async () => {
    const { data, error } = await sb.from('tasks').select('*').order('created_at', { ascending: false });
    if (error) { flagError('Error cargando tareas: ' + error.message); return; }
    setTasksState(data || []);
  })(); }, []);
  const addTask = uC((t) => {
    const tmp = { id: 'tmp' + Math.random(), title: t.title, description: t.description || null, priority: t.priority || 'media', due_date: t.due_date || null, completed_at: null, lead_id: t.lead_id || null };
    setTasksState((ts) => [tmp, ...ts]);
    sb.from('tasks').insert({ title: tmp.title, description: tmp.description, priority: tmp.priority, due_date: tmp.due_date, lead_id: tmp.lead_id }).select().single()
      .then(({ data, error }) => { if (error) flagError('No se pudo crear la tarea: ' + error.message); else if (data) setTasksState((ts) => ts.map((x) => x.id === tmp.id ? data : x)); });
  }, []);
  const toggleTask = uC((id) => {
    setTasksState((ts) => {
      const next = ts.map((x) => x.id === id ? { ...x, completed_at: x.completed_at ? null : new Date().toISOString() } : x);
      const t = next.find((x) => x.id === id);
      sb.from('tasks').update({ completed_at: t.completed_at }).eq('id', id).then(({ error }) => { if (error) flagError('No se pudo actualizar la tarea: ' + error.message); });
      return next;
    });
  }, []);
  const deleteTask = uC((id) => {
    setTasksState((ts) => ts.filter((x) => x.id !== id));
    sb.from('tasks').delete().eq('id', id).then(({ error }) => { if (error) flagError('No se pudo eliminar la tarea: ' + error.message); });
  }, []);
  return { tasks, addTask, toggleTask, deleteTask };
}

Object.assign(window, { useConfig, useLeads, useCycles, useBitacora, useDaily, useTasks, tsToDate, tsToStamp });
