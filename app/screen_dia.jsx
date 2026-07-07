/* ══════════════════════════════════════════════════════════════════
   screen_dia.jsx · MI DÍA — el centro de mando.
   ══════════════════════════════════════════════════════════════════ */
const { useState: udS, useEffect: udE, useRef: udR } = React;

/* Cabecera nombre + badges + link a LinkedIn */
function LeadLine({ lead, onOpen }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
      <MaturityDot stage={lead.stage} />
      <a href={lead.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
        style={{ fontWeight: 650, fontSize: 14, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {lead.nombre}<Icon name="externalLink" size={12} style={{ color: 'var(--text-3)' }} />
      </a>
      {lead.teInvito && <StarBadge />}
      <TempBadge id={lead.temperatura} size="sm" />
      <VariantBadge v={lead.variante} altered={lead.altered} />
      <span className="pill" style={{ background: 'var(--field-bg)', color: 'var(--text-3)', height: 20 }}>{lead.area}</span>
      {onOpen && <IconButton name="chevronRight" size={15} title="Abrir ficha" onClick={() => onOpen(lead.id)} style={{ marginLeft: 'auto' }} />}
    </div>
  );
}

/* Tarjeta de mensaje copiable (M1 o follow-up) */
function MessageCard({ lead, kind, bumps, active, onActivate, onCopy, onSend, onOpen }) {
  const isFu = kind === 'fu';
  const fuIndex = (lead.fuCount || 0) + 1;
  const suggested = isFu
    ? PDATA.fillBump(bumps[Math.min(2, fuIndex - 1)], lead.nombre.split(' ')[0])
    : lead.mensaje;
  const [editing, setEditing] = udS(false);
  const [text, setText] = udS(suggested);
  udE(() => { setText(suggested); setEditing(false); }, [lead.id, kind]);
  const altered = text.trim() !== suggested.trim();

  return (
    <div onMouseDown={onActivate}
      style={{ padding: '13px 15px', borderBottom: '1px solid var(--line)', background: active ? 'var(--gold-dim)' : 'transparent', transition: 'background var(--dur-fast) var(--ease)', position: 'relative' }}>
      {active && <span style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 99, background: 'var(--gold)' }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <LeadLine lead={lead} onOpen={onOpen} />
      </div>
      {isFu && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="pill" style={{ background: 'var(--warm-bg)', color: 'var(--warm)' }}>Follow-up {fuIndex}/3</span>
          <span className="meta">Último toque {ageLabel(lead.ultimoContacto)}</span>
        </div>
      )}
      {editing ? (
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} autoFocus />
      ) : (
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2)', background: 'var(--field-bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '11px 13px', whiteSpace: 'pre-wrap' }}>
          {text}
        </div>
      )}
      {editing && altered && !isFu && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12, color: 'var(--amber)' }}>
          <Icon name="alert" size={13} /> Copy alterado: este lead quedará excluido del test A/B (guardaré ambos textos).
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
        <Button variant="gold" icon="copy" onClick={() => onCopy(text)}>Copiar</Button>
        <Button variant="default" icon="check" onClick={() => onSend(lead, text, altered)}>{isFu ? 'FU enviado' : 'Enviado'}</Button>
        <Button variant="ghost" size="sm" icon="pencil" onClick={() => setEditing((e) => !e)}>{editing ? 'Hecho' : 'Editar antes de enviar'}</Button>
      </div>
    </div>
  );
}

/* Tarjeta de "esperando tu respuesta" */
function WaitingCard({ lead, onOpen, onReplied }) {
  const age = -daysFromToday(lead.repliedAt);
  const hot = age >= 1;
  return (
    <div style={{ padding: '13px 15px', borderBottom: '1px solid var(--line)' }}>
      <LeadLine lead={lead} onOpen={onOpen} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
        <span className="pill" style={{ background: hot ? 'var(--danger-bg)' : 'var(--field-bg)', color: hot ? 'var(--danger)' : 'var(--text-3)' }}>
          <Icon name="clock" size={12} /> Te respondió {ageLabel(lead.repliedAt)}
        </span>
        {hot && <span className="meta" style={{ color: 'var(--danger)' }}>A un caliente se le responde en horas ⏱️</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          <Button size="sm" variant="gold" icon="arrowRight" onClick={() => onOpen(lead.id)}>Dar el siguiente paso</Button>
        </div>
      </div>
    </div>
  );
}

/* Munición banner */
function AmmoBanner({ ammo, onLaunch }) {
  if (!ammo.low) return null;
  return (
    <div className="card" style={{ padding: '13px 16px', borderColor: 'var(--hot)', background: 'var(--hot-bg)', display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 20 }}>🔫</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>Sin munición pronto</div>
        <div className="meta">Quedan <b className="tnum" style={{ color: 'var(--hot)' }}>{ammo.dias.toFixed(1)} días</b> de cola de leads pendientes. Toca lanzar ciclo con el agente.</div>
      </div>
      <AmmoMagazine total={ammo.pendientes} perDay={ammo.pendientes / Math.max(0.1, ammo.dias)} tone="var(--hot)" />
      <Button variant="gold" icon="target" onClick={onLaunch}>Lanzar ciclo 🎯</Button>
    </div>
  );
}

function MiDia({ leads, config, actions, daily, ammo }) {
  const q = queues(leads);
  const money = pipelineMoney(leads, config.ticketMedio);
  const rs = replyStats(leads);
  const objetivo = config.objetivoDiario;
  const hitGoal = daily.sent >= objetivo;
  const [activeId, setActiveId] = udS(q.enviarAhora[0] ? q.enviarAhora[0].id : null);
  const [filtro, setFiltro] = udS('todo');   // todo | nuevos | followups
  const showNuevos = filtro !== 'followups';
  const showFups = filtro !== 'nuevos';
  const humor = config.humor;

  // semáforo reply rate vs benchmark 20%
  const rr = rs.replyRate;
  const rrTier = rr >= 20 ? 'ok' : 'warn';
  const rrColor = rrTier === 'ok' ? 'var(--green)' : 'var(--amber)';
  const rrDot = rrTier === 'ok' ? '🟢' : '🟡';

  // atajos C / E / U sobre la tarjeta activa de "enviar ahora"
  udE(() => {
    const active = q.enviarAhora.find((l) => l.id === activeId) || q.enviarAhora[0];
    const h = (e) => {
      if (e.target.matches('input, textarea')) return;
      const k = e.key.toLowerCase();
      if (k === 'c' && active) { actions.copy(active.mensaje); }
      else if (k === 'e' && active) { actions.markSent(active, active.mensaje, false); const idx = q.enviarAhora.findIndex((l) => l.id === active.id); const nx = q.enviarAhora[idx + 1]; setActiveId(nx ? nx.id : null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [activeId, leads]);

  const empty = !q.enviarAhora.length && !q.followupsHoy.length && !q.esperando.length && !q.neveraDespierta.length;

  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960, margin: '0 auto' }}>

      {/* ── Centro de mando ── */}
      <div className="card card-hair" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 22, alignItems: 'center' }}>
        <ProgressRing value={daily.sent} max={objetivo} size={128} stroke={11} color="var(--gold)">
          <div className="serif tnum" style={{ fontSize: 30, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{daily.sent}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>/ {objetivo} hoy</div>
        </ProgressRing>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, alignItems: 'center' }}>
          <div>
            <div className="rail-lbl" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>💰 Pasta en juego</div>
            <div className="serif tnum" style={{ fontSize: 40, fontWeight: 600, color: 'var(--gold-bright)', letterSpacing: '-.03em', lineHeight: 1.05, marginTop: 4 }}>
              <AnimatedNumber value={money.total} format={fmtEur} />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>{money.count} leads en oferta·trial·llamada × {fmtEur(config.ticketMedio)}/mes</div>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="rail-lbl">Racha</div>
              <div style={{ marginTop: 5 }}><StreakFlame days={daily.streak} /></div>
            </div>
            <div>
              <div className="rail-lbl">Reply rate</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 13 }}>{rrDot}</span>
                <b className="serif tnum" style={{ fontSize: 22, color: rrColor, fontWeight: 600 }}>{rr.toFixed(0)}%</b>
                <span className="meta">vs 20% ideal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AmmoBanner ammo={ammo} onLaunch={actions.launchCycle} />

      {/* ── Filtro de acciones ── */}
      <div className="seg" style={{ alignSelf: 'flex-start' }}>
        <button className={`seg-btn${filtro === 'todo' ? ' active' : ''}`} onClick={() => setFiltro('todo')}>Todo</button>
        <button className={`seg-btn${filtro === 'nuevos' ? ' active' : ''}`} onClick={() => setFiltro('nuevos')}>🎯 Nuevos{q.enviarAhora.length ? ` · ${q.enviarAhora.length}` : ''}</button>
        <button className={`seg-btn${filtro === 'followups' ? ' active' : ''}`} onClick={() => setFiltro('followups')}>↩️ Follow-ups{q.followupsHoy.length ? ` · ${q.followupsHoy.length}` : ''}</button>
      </div>

      {empty && <SectionCard><EmptyState emoji="🏹" title={humor ? randomFrom(PDATA.FRASES_VACIO) : 'Todo al día'} hint="No hay nada pendiente en la cola. Revisa el pipeline o lanza un ciclo de captación para reponer leads." action={<Button variant="gold" icon="target" onClick={actions.launchCycle}>Reponer leads</Button>} /></SectionCard>}

      {/* ── Enviar ahora ── */}
      {showNuevos && q.enviarAhora.length > 0 && (
        <SectionCard title="Enviar ahora" emoji="🎯" count={q.enviarAhora.length}
          right={<span className="meta">Atajos: <b>C</b> copiar · <b>E</b> enviado</span>}>
          {q.enviarAhora.slice(0, 8).map((l) => (
            <MessageCard key={l.id} lead={l} kind="m1" bumps={config.bumps}
              active={l.id === activeId} onActivate={() => setActiveId(l.id)}
              onCopy={actions.copy}
              onSend={(lead, text, altered) => { actions.markSent(lead, text, altered); const idx = q.enviarAhora.findIndex((x) => x.id === lead.id); const nx = q.enviarAhora[idx + 1]; setActiveId(nx ? nx.id : null); }}
              onOpen={actions.openLead} />
          ))}
          {q.enviarAhora.length > 8 && <div style={{ padding: '11px 15px', fontSize: 12.5, color: 'var(--text-3)' }}>+ {q.enviarAhora.length - 8} más en la cola de pendientes</div>}
        </SectionCard>
      )}

      {/* ── Follow-ups de hoy ── */}
      {showFups && q.followupsHoy.length > 0 && (
        <SectionCard title="Follow-ups de hoy" emoji="↩️" count={q.followupsHoy.length}
          right={<span className="meta">Máx. 3 · uno al día</span>}>
          {q.followupsHoy.slice(0, 8).map((l) => (
            <MessageCard key={l.id} lead={l} kind="fu" bumps={config.bumps}
              active={false} onActivate={() => {}}
              onCopy={actions.copy}
              onSend={(lead, text) => actions.markFollowup(lead, text)}
              onOpen={actions.openLead} />
          ))}
        </SectionCard>
      )}

      {/* FU3 vencidos → sugerir silencio */}
      {showFups && q.fu3Vencidos.length > 0 && (
        <SectionCard title="Cierra el hilo" emoji="🔇" count={q.fu3Vencidos.length}
          right={<span className="meta">FU3 enviado y sin respuesta</span>}>
          {q.fu3Vencidos.map((l) => (
            <div key={l.id} style={{ padding: '12px 15px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <LeadLine lead={l} onOpen={actions.openLead} />
              <Button size="sm" variant="ghost" icon="moon" style={{ marginLeft: 'auto' }} onClick={() => actions.toSilence(l)}>Pasar a silencio cerrado</Button>
            </div>
          ))}
        </SectionCard>
      )}

      {/* ── Esperando tu respuesta ── */}
      {showFups && q.esperando.length > 0 && (
        <SectionCard title="Esperando tu respuesta" emoji="⏳" count={q.esperando.length}>
          {q.esperando.map((l) => <WaitingCard key={l.id} lead={l} onOpen={actions.openLead} />)}
        </SectionCard>
      )}

      {/* ── Nevera que despierta ── */}
      {showFups && q.neveraDespierta.length > 0 && (
        <SectionCard title="Nevera que despierta" emoji="🧊" count={q.neveraDespierta.length}
          right={<span className="meta">Fecha de recontacto alcanzada</span>}>
          {q.neveraDespierta.map((l) => (
            <div key={l.id} style={{ padding: '12px 15px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <LeadLine lead={l} onOpen={actions.openLead} />
              <span className="meta" style={{ marginLeft: 4 }}>Recontactar {ageLabel(l.snoozeUntil)}</span>
              <Button size="sm" variant="gold" icon="refresh" style={{ marginLeft: 'auto' }} onClick={() => actions.wake(l)}>Recontactar</Button>
            </div>
          ))}
        </SectionCard>
      )}

      {/* filtro sin resultados */}
      {!empty && showNuevos && !showFups && q.enviarAhora.length === 0 && (
        <SectionCard><EmptyState emoji="✅" title="Sin nuevos por enviar" hint="No hay leads nuevos en la cola de hoy. Cambia a Follow-ups o lanza un ciclo de captación." /></SectionCard>
      )}
      {!empty && showFups && !showNuevos && !q.followupsHoy.length && !q.fu3Vencidos.length && !q.esperando.length && !q.neveraDespierta.length && (
        <SectionCard><EmptyState emoji="✅" title="Sin follow-ups pendientes" hint="Ningún lead anterior requiere seguimiento ahora mismo." /></SectionCard>
      )}
    </div>
  );
}

Object.assign(window, { MiDia, LeadLine });
