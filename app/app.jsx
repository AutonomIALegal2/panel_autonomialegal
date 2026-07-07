/* ══════════════════════════════════════════════════════════════════
   app.jsx · Panel AutonomIA — routing, estado global, acciones con
   undo de 5s, celebraciones, atajos y tweaks.
   ══════════════════════════════════════════════════════════════════ */
const { useState: uaS, useEffect: uaE, useRef: uaR, useMemo: uaM } = React;

const NAV = [
  { id: 'dia',       emoji: '🌅', label: 'Mi día' },
  { id: 'pipeline',  emoji: '🗂️', label: 'Pipeline' },
  { id: 'lab',       emoji: '🧪', label: 'Laboratorio A/B' },
  { id: 'embudo',    emoji: '📊', label: 'Embudo & señales' },
  { id: 'captacion', emoji: '🎯', label: 'Captación' },
  { id: 'config',    emoji: '⚙️', label: 'Config' },
];

function nowTs() {
  const d = new Date();
  return PDATA.now(d.getHours(), d.getMinutes());
}

function Rail({ route, go, money }) {
  return (
    <div className="rail">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 14px' }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,var(--gold),var(--gold-deep))', fontSize: 16, boxShadow: 'var(--glow-gold)' }}>💰</div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 750, fontSize: 14, letterSpacing: '-.01em' }}>Panel AutonomIA</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Máquina de prospección</div>
        </div>
      </div>
      <nav style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {NAV.map((n) => (
          <button key={n.id} className={`nav-item${route === n.id ? ' active' : ''}`} onClick={() => go(n.id)}>
            <span className="nav-emoji">{n.emoji}</span>{n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: 14, borderTop: '1px solid var(--line)' }}>
        <div className="rail-lbl" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>💰 Pasta en juego</div>
        <div className="serif tnum" style={{ fontSize: 24, fontWeight: 600, color: 'var(--gold-bright)', marginTop: 4 }}>
          <AnimatedNumber value={money} format={fmtEur} />
        </div>
      </div>
    </div>
  );
}

function BottomNav({ route, go }) {
  return (
    <div className="bottom-nav">
      {NAV.map((n) => (
        <button key={n.id} className={`bn-item${route === n.id ? ' active' : ''}`} onClick={() => go(n.id)}>
          <span className="nav-emoji">{n.emoji}</span>{n.label.split(' ')[0]}
        </button>
      ))}
    </div>
  );
}

function ReplyModal({ lead, onClose, onConfirm }) {
  const [type, setType] = uaS('POSITIVA');
  return (
    <Modal title={`Respuesta de ${lead.nombre.split(' ')[0]}`} subtitle="Registrar el tipo de respuesta es obligatorio." onClose={onClose} width={420}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="gold" icon="check" onClick={() => { onConfirm(type); onClose(); }}>Registrar</Button></>}>
      <div className="seg" style={{ width: '100%' }}>
        {['POSITIVA', 'NEUTRA', 'NEGATIVA'].map((rt) => (
          <button key={rt} className={`seg-btn${type === rt ? ' active' : ''}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setType(rt)}>
            {rt === 'POSITIVA' ? '🎣 ' : rt === 'NEUTRA' ? '😐 ' : '🙅 '}{rt[0] + rt.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
    </Modal>
  );
}

function App() {
  const [config, setConfig] = useConfig();
  const { leads, patchLead, setStage: hookSetStage, addMessage, addCapture, addLead, deleteLead, replaceAll } = useLeads();
  const { cycles, addCycle, setCycles } = useCycles();
  const { notes: bitacora, addNote } = useBitacora();
  const { daily, bump } = useDaily();

  const [route, setRoute] = uaS('dia');
  const [view, setView] = uaS('kanban');
  const [drawerId, setDrawerId] = uaS(null);
  const [promptKind, setPromptKind] = uaS(null);
  const [pendingReply, setPendingReply] = uaS(null);
  const [toasts, setToasts] = uaS([]);

  const leadsRef = uaR(leads); uaE(() => { leadsRef.current = leads; }, [leads]);
  const dailyRef = uaR(daily); uaE(() => { dailyRef.current = daily; }, [daily]);

  // tema + humor a nivel documento
  uaE(() => { document.documentElement.dataset.ptheme = config.theme; }, [config.theme]);
  uaE(() => { window.__panelHumor = config.humor; window.__ticket = config.ticketMedio; }, [config.humor, config.ticketMedio]);

  const money = pipelineMoney(leads, config.ticketMedio).total;
  const ammo = ammoStatus(leads, config.objetivoDiario, config.umbralMunicion);

  /* ── toasts + undo ── */
  const dismiss = (id) => setToasts((ts) => ts.filter((x) => x.id !== id));
  const pushToast = (msg, opts = {}) => {
    const id = 't' + Date.now() + Math.random();
    const action = opts.action || (opts.undo ? { label: 'Deshacer', fn: () => replaceAll(opts.undo) } : null);
    setToasts((ts) => [...ts.slice(-2), { id, msg, emoji: opts.emoji, action }]);
    setTimeout(() => dismiss(id), 5200);
  };

  /* ── acciones (contrato que consumen las pantallas) ── */
  const copy = (text) => { copyText(text); pushToast('Mensaje copiado al portapapeles', { emoji: '📋' }); };

  const markSent = (lead, text, altered) => {
    const prev = leadsRef.current;
    patchLead(lead.id, (l) => ({
      stage: 'm1', m1Date: PDATA.TODAY, ultimoContacto: PDATA.TODAY, altered: !!altered || l.altered,
      messages: [...(l.messages || []), { id: 'm' + Date.now(), type: 'M1', suggested: lead.mensaje, sent: text, altered: !!altered, date: nowTs() }],
      events: [{ ts: nowTs(), kind: 'sent', text: 'M1 enviado' + (altered ? ' (copy alterado)' : '') }, ...(l.events || [])],
    }));
    const before = dailyRef.current.sent; bump(1);
    if (before < config.objetivoDiario && before + 1 >= config.objetivoDiario) {
      celebrate('goal'); pushToast(config.humor ? randomFrom(PDATA.FRASES_META) : 'Objetivo diario cumplido', { emoji: '🎉' });
    } else {
      pushToast('M1 enviado a ' + lead.nombre.split(' ')[0], { emoji: '✅', undo: prev });
    }
  };

  const markFollowup = (lead, text) => {
    const prev = leadsRef.current;
    const fi = (lead.fuCount || 0) + 1;
    patchLead(lead.id, (l) => ({
      fuCount: fi, ultimoContacto: PDATA.TODAY,
      messages: [...(l.messages || []), { id: 'm' + Date.now(), type: 'FU' + fi, suggested: text, sent: text, altered: false, date: nowTs() }],
      events: [{ ts: nowTs(), kind: 'fu', text: `Follow-up ${fi}/3 enviado` }, ...(l.events || [])],
    }));
    pushToast(`FU ${fi}/3 enviado a ${lead.nombre.split(' ')[0]}`, { emoji: '↩️', undo: prev });
  };

  const markReply = (lead, type) => {
    const prev = leadsRef.current;
    patchLead(lead.id, (l) => ({
      stage: 'respondio', replyType: type, repliedAt: PDATA.TODAY,
      qualif: l.qualif || { size: 'Por cualificar', crm: '—', expedientes: '—', frustracion: '—' },
      events: [{ ts: nowTs(), kind: 'reply', text: 'Respuesta ' + type.toLowerCase() }, ...(l.events || [])],
    }));
    if (type === 'POSITIVA') { pushToast('¡Ha picado! 🎣', { emoji: '🎣', undo: prev }); }
    else pushToast(`Respuesta registrada (${type.toLowerCase()})`, { emoji: '💬', undo: prev });
  };

  const setStage = (id, stage) => {
    const lead = leadsRef.current.find((l) => l.id === id); if (!lead || lead.stage === stage) return;
    if (stage === 'respondio' && !lead.replyType) { setPendingReply(lead); return; }
    const prev = leadsRef.current;
    const fwdIdx = PDATA.ETAPA_ORDER.indexOf(stage);
    const respIdx = PDATA.ETAPA_ORDER.indexOf('respondio');
    if (fwdIdx > respIdx && !lead.replyType) {
      // avanzar directo a una etapa del embudo (oferta+) implica respuesta positiva → dejar rastro completo
      patchLead(id, (l) => ({
        stage, replyType: 'POSITIVA', repliedAt: PDATA.TODAY,
        events: [
          { ts: nowTs(), kind: 'reply', text: 'Respuesta positiva (registrada al avanzar)' },
          { ts: nowTs(), kind: 'stage', text: `Movido a «${PDATA.etapa(stage).name}»` },
          ...(l.events || []),
        ],
      }));
    } else {
      hookSetStage(id, stage);
    }
    const et = PDATA.etapa(stage);
    if (stage === 'cliente') { celebrate('cliente'); pushToast(`🏆 ¡${lead.nombre.split(' ')[0]} es CLIENTE! A cobrar 💰`, { emoji: '🏆', undo: prev }); }
    else pushToast(`${lead.nombre.split(' ')[0]} → «${et.name}»`, { emoji: et.emoji, undo: prev });
  };

  const dropStage = (id, stage) => setStage(id, stage);
  const toSilence = (lead) => { const prev = leadsRef.current; hookSetStage(lead.id, 'silencio'); pushToast(`${lead.nombre.split(' ')[0]} pasó a silencio cerrado`, { emoji: '🔇', undo: prev }); };
  const wake = (lead) => { const prev = leadsRef.current; patchLead(lead.id, { stage: 'm1', snoozeUntil: null, ultimoContacto: PDATA.TODAY }, { kind: 'wake', text: 'Recontactado desde la nevera' }); pushToast(`Recontactando a ${lead.nombre.split(' ')[0]}`, { emoji: '🔥', undo: prev }); };
  const openLead = (id) => setDrawerId(id);
  const openPrompt = (kind) => setPromptKind(kind);
  const launchCycle = () => setPromptKind('buscar');

  /* ── import / export ── */
  const importCSV = (text) => {
    const rows = parseCSV(text);
    const existing = new Set(leadsRef.current.map((l) => l.url).filter(Boolean));
    const fresh = rows.map(csvRowToLead).filter((l) => !l.url || !existing.has(l.url));
    if (!fresh.length) { pushToast('No había leads nuevos (todos ya estaban por URL)', { emoji: '🔁' }); return; }
    replaceAll([...fresh, ...leadsRef.current]);
    pushToast(`${fresh.length} leads importados · ${rows.length - fresh.length} duplicados omitidos`, { emoji: '📥' });
  };
  const pickCSV = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv';
    inp.onchange = () => { const f = inp.files[0]; if (f) { const r = new FileReader(); r.onload = () => importCSV(r.result); r.readAsText(f); } };
    inp.click();
  };
  const importJSON = (obj) => {
    if (Array.isArray(obj.leads)) replaceAll(obj.leads);
    if (Array.isArray(obj.cycles)) setCycles(obj.cycles);
    if (obj.config) setConfig(obj.config);
    pushToast('Respaldo restaurado', { emoji: '♻️' });
  };
  const exportJSON = () => {
    const payload = { exportedAt: new Date().toISOString(), leads: leadsRef.current, cycles, bitacora, config };
    download(`panel-autonomia-${PDATA.TODAY}.json`, JSON.stringify(payload, null, 2));
    pushToast('Exportado a JSON', { emoji: '💾' });
  };

  /* ── atajo U = deshacer ── */
  uaE(() => {
    const h = (e) => {
      if (e.target.matches('input, textarea')) return;
      if (e.key.toLowerCase() === 'u') {
        const last = [...toasts].reverse().find((t) => t.action);
        if (last) { last.action.fn(); dismiss(last.id); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [toasts]);

  const removeLead = (id) => {
    const lead = leadsRef.current.find((l) => l.id === id); if (!lead) return;
    if (!window.confirm(`Eliminar a ${lead.nombre} del pipeline? No se puede deshacer.`)) return;
    deleteLead(id);
    pushToast(`${lead.nombre.split(' ')[0]} eliminado`, { emoji: '🗑️' });
  };

  const actions = { copy, markSent, markFollowup, markReply, setStage, dropStage, toSilence, wake, openLead, launchCycle, addCapture, patchLead, deleteLead: removeLead, ticket: config.ticketMedio };

  const drawerLead = drawerId ? leads.find((l) => l.id === drawerId) : null;
  const meta = NAV.find((n) => n.id === route);

  let screen;
  if (route === 'dia') screen = <MiDia leads={leads} config={config} actions={actions} daily={daily} ammo={ammo} />;
  else if (route === 'pipeline') screen = <Pipeline leads={leads} actions={actions} view={view} setView={setView} />;
  else if (route === 'lab') screen = <LabAB leads={leads} />;
  else if (route === 'embudo') screen = <Embudo leads={leads} bitacora={bitacora} addNote={addNote} />;
  else if (route === 'captacion') screen = <Captacion leads={leads} cycles={cycles} addCycle={addCycle} config={config} onImport={pickCSV} openPrompt={openPrompt} />;
  else if (route === 'config') screen = <Configuracion config={config} setConfig={setConfig} onImportCSV={importCSV} onImportJSON={importJSON} onExport={exportJSON} stats={{ leads: leads.length, cycles: cycles.length, messages: leads.reduce((s, l) => s + (l.messages || []).length, 0) }} />;

  const isPipeline = route === 'pipeline';

  return (
    <>
      <div className="bg-atmos" />
      <div className="app-shell">
        <Rail route={route} go={setRoute} money={money} />
        <div className="main-col">
          <div className="topbar">
            <div style={{ minWidth: 0 }}>
              <h1 className="h-page" style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span>{meta.emoji}</span>{meta.label}</h1>
              <div className="meta" style={{ marginTop: 1 }}>{PDATA.dayOffset(0) && fmtDateY(PDATA.TODAY)} · Europa/Madrid</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {ammo.low && <span className="pill" style={{ color: 'var(--hot)', background: 'var(--hot-bg)', cursor: 'pointer' }} onClick={launchCycle}>🔫 {ammo.dias.toFixed(1)}d de cola</span>}
              <IconButton name={config.theme === 'dark' ? 'sun' : 'moon'} title="Cambiar tema" onClick={() => setConfig({ theme: config.theme === 'dark' ? 'light' : 'dark' })} />
            </div>
          </div>
          <div className="content" style={isPipeline ? { display: 'flex', flexDirection: 'column' } : null}>{screen}</div>
        </div>
      </div>
      <BottomNav route={route} go={setRoute} />

      {drawerLead && <LeadDrawer lead={drawerLead} actions={actions} onClose={() => setDrawerId(null)} />}
      {promptKind && <CycleModal kind={promptKind} onClose={() => setPromptKind(null)} />}
      {pendingReply && <ReplyModal lead={pendingReply} onClose={() => setPendingReply(null)} onConfirm={(type) => markReply(pendingReply, type)} />}
      <Toaster toasts={toasts} dismiss={dismiss} />

      {/* Tweaks: knobs rápidos (fuente de verdad = config) */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Marca" />
        <TweakRadio label="Tema" value={config.theme} options={[{ value: 'dark', label: 'Oscuro' }, { value: 'light', label: 'Claro' }]} onChange={(v) => setConfig({ theme: v })} />
        <TweakToggle label="Modo humor" value={config.humor} onChange={(v) => setConfig({ humor: v })} />
        <TweakSection label="Números" />
        <TweakSlider label="Ticket medio" value={config.ticketMedio} min={30} max={300} step={5} unit=" €" onChange={(v) => setConfig({ ticketMedio: v })} />
        <TweakSlider label="Objetivo diario" value={config.objetivoDiario} min={10} max={80} step={5} unit=" M1" onChange={(v) => setConfig({ objetivoDiario: v })} />
      </TweaksPanel>
    </>
  );
}

Object.assign(window, { App });
