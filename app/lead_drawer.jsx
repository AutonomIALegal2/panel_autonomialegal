/* ══════════════════════════════════════════════════════════════════
   lead_drawer.jsx · Ficha del lead (drawer lateral).
   ══════════════════════════════════════════════════════════════════ */
const { useState: ulS, useEffect: ulE, useRef: ulR } = React;

const MSG_TYPE_COLOR = { M1: 'var(--accent-bright)', FU1: 'var(--warm)', FU2: 'var(--warm)', FU3: 'var(--warm)', Oferta: 'var(--gold-bright)', M2: 'var(--st-oferta)' };

function QualRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
      <Icon name={icon} size={14} style={{ color: 'var(--text-3)' }} />
      <span className="meta" style={{ width: 128, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 550 }}>{value || '—'}</span>
    </div>
  );
}

function MessageHistory({ messages }) {
  if (!messages || !messages.length) return <div className="meta" style={{ padding: '6px 0' }}>Aún no se ha enviado ningún mensaje.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {messages.map((m) => {
        const differs = m.altered && m.sent && m.suggested && m.sent.trim() !== m.suggested.trim();
        return (
          <div key={m.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', background: 'var(--panel-2)', borderBottom: '1px solid var(--line)' }}>
              <span className="badge mono" style={{ color: MSG_TYPE_COLOR[m.type] || 'var(--text-2)', background: 'var(--field-bg)' }}>{m.type}</span>
              {differs && <span className="pill" style={{ height: 19, fontSize: 10, color: 'var(--amber)', background: 'var(--amber-bg)' }}>copy alterado</span>}
              <span className="meta" style={{ marginLeft: 'auto' }}>{fmtTs(m.date)}</span>
            </div>
            <div style={{ padding: '10px 12px' }}>
              {differs ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-4)', marginBottom: 4 }}>Enviado</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{m.sent}</div>
                  </div>
                  <div style={{ borderTop: '1px dashed var(--line-md)', paddingTop: 8 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-4)', marginBottom: 4 }}>Sugerido (original A/B)</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-4)', whiteSpace: 'pre-wrap' }}>{m.suggested}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{m.sent || m.suggested}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Captures({ lead, onAdd, onZoom }) {
  const zoneRef = ulR(null);
  ulE(() => {
    const el = zoneRef.current; if (!el) return;
    const onPaste = (e) => {
      const items = (e.clipboardData || {}).items || [];
      for (const it of items) {
        if (it.type && it.type.startsWith('image/')) {
          const file = it.getAsFile();
          const reader = new FileReader();
          reader.onload = () => onAdd({ id: 'cap' + Date.now(), src: reader.result, at: PDATA.TODAY });
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    };
    el.addEventListener('paste', onPaste);
    return () => el.removeEventListener('paste', onPaste);
  }, [onAdd]);
  const caps = lead.captures || [];
  return (
    <div>
      <div ref={zoneRef} tabIndex={0}
        style={{ border: '1px dashed var(--line-strong)', borderRadius: 'var(--r-sm)', padding: '10px 12px', fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'text', outline: 'none' }}
        onClick={(e) => e.currentTarget.focus()}>
        <Icon name="clipboard" size={14} /> Haz clic aquí y pega (⌘/Ctrl+V) una captura de la conversación
      </div>
      {caps.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {caps.map((c) => (
            <button key={c.id} onClick={() => c.src && onZoom(c.src)}
              style={{ width: 92, height: 62, borderRadius: 'var(--r-sm)', border: '1px solid var(--line-md)', overflow: 'hidden', padding: 0, background: c.src ? 'transparent' : 'linear-gradient(135deg, var(--panel-2), var(--panel-3))', position: 'relative' }}>
              {c.src ? <img src={c.src} alt="captura" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 18 }}>💬</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LeadDrawer({ lead, actions, onClose }) {
  const [tab, setTab] = ulS('mensajes');
  const [zoom, setZoom] = ulS(null);
  const [notes, setNotes] = ulS(lead.notas || '');
  const [askReply, setAskReply] = ulS(false);
  const [replyType, setReplyType] = ulS('POSITIVA');
  ulE(() => { setNotes(lead.notas || ''); setAskReply(false); }, [lead.id]);

  const e = PDATA.etapa(lead.stage);
  const nextStages = PDATA.ETAPA_ORDER.slice(PDATA.ETAPA_ORDER.indexOf(lead.stage) + 1);
  const canReply = lead.stage === 'm1' || lead.stage === 'pendiente';

  const doStage = (stage) => {
    if (stage === 'respondio') { setAskReply(true); return; }
    actions.setStage(lead.id, stage);
  };

  return (
    <Drawer onClose={onClose}>
      {/* header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <MaturityDot stage={lead.stage} size={17} />
            <a href={lead.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {lead.nombre}<Icon name="externalLink" size={13} style={{ color: 'var(--text-3)' }} />
            </a>
            {lead.teInvito && <StarBadge />}
          </div>
          <div className="meta" style={{ marginTop: 4 }}>{lead.perfil || '—'}{lead.ciudad ? ` · ${lead.ciudad}` : ''}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <StageBadge stage={lead.stage} />
            <TempBadge id={lead.temperatura} size="sm" />
            <VariantBadge v={lead.variante} altered={lead.altered} />
            <span className="pill" style={{ background: 'var(--field-bg)', color: 'var(--text-3)', height: 20 }}>{lead.angulo}</span>
          </div>
        </div>
        <IconButton name="x" title="Cerrar" onClick={onClose} />
      </div>

      {/* estado: botonera */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)' }}>
        {askReply ? (
          <div style={{ background: 'var(--panel-2)', border: '1px solid var(--line-md)', borderRadius: 'var(--r-sm)', padding: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 650, marginBottom: 9 }}>¿Qué tipo de respuesta ha sido? <span style={{ color: 'var(--danger)' }}>*</span></div>
            <div className="seg" style={{ width: '100%' }}>
              {['POSITIVA', 'NEUTRA', 'NEGATIVA'].map((rt) => (
                <button key={rt} className={`seg-btn${replyType === rt ? ' active' : ''}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setReplyType(rt)}>
                  {rt === 'POSITIVA' ? '🎣 ' : rt === 'NEUTRA' ? '😐 ' : '🙅 '}{rt[0] + rt.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
              <Button size="sm" variant="ghost" onClick={() => setAskReply(false)}>Cancelar</Button>
              <Button size="sm" variant="gold" icon="check" onClick={() => { actions.markReply(lead, replyType); setAskReply(false); }}>Registrar respuesta</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
            {canReply && <Button size="sm" variant="gold" icon="mail" onClick={() => setAskReply(true)}>Respondió</Button>}
            {nextStages.filter((s) => s !== 'respondio').slice(0, 3).map((s) => {
              const st = PDATA.etapa(s);
              return <Button key={s} size="sm" variant={st.trophy ? 'gold' : 'default'} onClick={() => doStage(s)}>{st.emoji} {st.short}</Button>;
            })}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <IconButton name="moon" size={15} title="Nevera" onClick={() => actions.setStage(lead.id, 'nevera')} />
              <IconButton name="x" size={15} title="Perdido" onClick={() => actions.setStage(lead.id, 'perdido')} />
            </div>
          </div>
        )}
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 20px 0' }}>
        {[['mensajes', 'Mensajes'], ['ficha', 'Ficha'], ['actividad', 'Actividad']].map(([k, l]) => (
          <button key={k} className={`seg-btn${tab === k ? ' active' : ''}`} onClick={() => setTab(k)} style={{ borderRadius: 'var(--r-sm) var(--r-sm) 0 0' }}>{l}</button>
        ))}
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: '16px 20px 24px' }}>
        {tab === 'mensajes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div className="rail-lbl" style={{ marginBottom: 10 }}>Historial de mensajes</div>
              <MessageHistory messages={lead.messages} />
            </div>
            <div>
              <div className="rail-lbl" style={{ marginBottom: 10 }}>Capturas de conversación</div>
              <Captures lead={lead} onAdd={(cap) => actions.addCapture(lead.id, cap)} onZoom={setZoom} />
            </div>
          </div>
        )}
        {tab === 'ficha' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div className="rail-lbl" style={{ marginBottom: 6 }}>Cualificación</div>
              {lead.qualif ? (
                <div>
                  <QualRow icon="users" label="Tamaño del despacho" value={lead.qualif.size} />
                  <QualRow icon="fileText" label="CRM / sistema actual" value={lead.qualif.crm} />
                  <QualRow icon="briefcase" label="Expedientes activos" value={lead.qualif.expedientes} />
                  <QualRow icon="alert" label="Mayor frustración" value={lead.qualif.frustracion} />
                </div>
              ) : <div className="meta">Sin cualificar todavía. Se completa cuando el lead responde.</div>}
            </div>
            <div>
              <div className="rail-lbl" style={{ marginBottom: 6 }}>Datos</div>
              <QualRow icon="mapPin" label="Ciudad" value={lead.ciudad ? `${lead.ciudad}, ${lead.pais}` : lead.pais} />
              <QualRow icon="scale" label="Área" value={lead.area} />
              <QualRow icon="calendar" label="Conectasteis" value={fmtDateY(lead.conectoEl)} />
              <QualRow icon="target" label="Prioridad" value={'★'.repeat(Math.max(0, Math.min(3, 4 - (lead.prioridad || 3)))) || `#${lead.prioridad}`} />
            </div>
            <div>
              <div className="rail-lbl" style={{ marginBottom: 8 }}>Notas</div>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => actions.patchLead(lead.id, { notas: notes })} placeholder="Anota lo que sepas de este despacho…" rows={3} />
            </div>
          </div>
        )}
        {tab === 'actividad' && (
          <div>
            <div className="rail-lbl" style={{ marginBottom: 12 }}>Historial de eventos</div>
            {(lead.events || []).length === 0 ? <div className="meta">Sin actividad todavía.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {lead.events.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: 11, paddingBottom: 14, position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ width: 9, height: 9, borderRadius: 99, background: 'var(--gold)', marginTop: 4, flexShrink: 0 }} />
                      {i < lead.events.length - 1 && <span style={{ width: 1, flex: 1, background: 'var(--line-md)', marginTop: 3 }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text)' }}>{ev.text}</div>
                      <div className="meta">{fmtTs(ev.ts)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {zoom && (
        <div className="overlay" style={{ zIndex: 200 }} onMouseDown={() => setZoom(null)}>
          <img src={zoom} alt="captura ampliada" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-modal)' }} />
        </div>
      )}
    </Drawer>
  );
}

Object.assign(window, { LeadDrawer });
