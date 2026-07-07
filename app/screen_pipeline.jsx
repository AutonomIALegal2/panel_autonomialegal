/* ══════════════════════════════════════════════════════════════════
   screen_pipeline.jsx · PIPELINE — Kanban drag&drop + tabla filtrable.
   ══════════════════════════════════════════════════════════════════ */
const { useState: upS, useMemo: upM } = React;

function KCard({ lead, onOpen, onDelete, onDragStart, onDragEnd, dragging }) {
  return (
    <div className={`kcard${dragging ? ' dragging' : ''}`} draggable
      onDragStart={(e) => onDragStart(e, lead)} onDragEnd={onDragEnd}
      onClick={() => onOpen(lead.id)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <MaturityDot stage={lead.stage} size={14} />
        <span style={{ fontWeight: 650, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.nombre}</span>
        {lead.teInvito && <span style={{ fontSize: 11 }}>⭐</span>}
        <button title="Eliminar lead" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ marginLeft: 'auto', background: 'none', border: 0, cursor: 'pointer', fontSize: 12, opacity: 0.45, padding: 2, lineHeight: 1, flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)} onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.45)}>🗑️</button>
      </div>
      <div className="meta" style={{ marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.area} · {lead.ciudad}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <TempBadge id={lead.temperatura} size="sm" />
        <VariantBadge v={lead.variante} altered={lead.altered} />
        {lead.replyType === 'POSITIVA' && <span title="Respuesta positiva" style={{ fontSize: 12 }}>🎣</span>}
      </div>
    </div>
  );
}

function Kanban({ leads, actions, onDropStage }) {
  const [dragId, setDragId] = upS(null);
  const [overCol, setOverCol] = upS(null);
  const onDragStart = (e, lead) => { setDragId(lead.id); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', lead.id); } catch (x) {} };
  const onDragEnd = () => { setDragId(null); setOverCol(null); };
  return (
    <div className="kanban">
      {PDATA.ETAPAS.map((et) => {
        const items = leads.filter((l) => l.stage === et.id);
        const money = PIPELINE_MONEY_STAGES.has(et.id);
        return (
          <div key={et.id} className={`kcol${overCol === et.id ? ' drop-on' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOverCol(et.id); }}
            onDragLeave={() => setOverCol((c) => c === et.id ? null : c)}
            onDrop={(e) => { e.preventDefault(); if (dragId) onDropStage(dragId, et.id); setOverCol(null); setDragId(null); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 12px 9px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: et.color, boxShadow: `0 0 7px ${et.color}` }} />
              <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text)' }}>{et.emoji} {et.short}</span>
              <span className="pill tnum" style={{ marginLeft: 'auto', height: 19, background: 'var(--field-bg)', color: 'var(--text-3)' }}>{items.length}</span>
            </div>
            <div className="scroll-y" style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
              {items.map((l) => <KCard key={l.id} lead={l} onOpen={actions.openLead} onDelete={() => actions.deleteLead(l.id)} dragging={dragId === l.id} onDragStart={onDragStart} onDragEnd={onDragEnd} />)}
              {money && items.length > 0 && (
                <div style={{ marginTop: 2, fontSize: 11, color: 'var(--gold-bright)', textAlign: 'center', fontWeight: 600 }}>💰 {fmtEur(items.length * (window.__ticket || 50))}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FilterPill({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} className="pill" style={{ height: 28, cursor: 'pointer', border: '1px solid ' + (active ? (color || 'var(--accent-line)') : 'var(--line-md)'), background: active ? (color ? 'color-mix(in srgb,' + color + ' 16%, transparent)' : 'var(--accent-dim)') : 'transparent', color: active ? (color || 'var(--accent-bright)') : 'var(--text-3)' }}>
      {label}
    </button>
  );
}

function Table({ leads, actions }) {
  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <div className="scroll-y" style={{ maxHeight: '100%' }}>
        <table className="tbl">
          <thead><tr>
            <th>Lead</th><th>Etapa</th><th>Temp.</th><th>Variante</th><th>Área</th><th>Últ. contacto</th><th style={{ width: 34 }}></th>
          </tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} onClick={() => actions.openLead(l.id)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <MaturityDot stage={l.stage} size={13} />
                    <span style={{ fontWeight: 600 }}>{l.nombre}</span>
                    {l.teInvito && <span style={{ fontSize: 11 }}>⭐</span>}
                  </div>
                </td>
                <td><StageBadge stage={l.stage} /></td>
                <td><TempBadge id={l.temperatura} size="sm" /></td>
                <td><VariantBadge v={l.variante} altered={l.altered} /></td>
                <td style={{ color: 'var(--text-2)' }}>{l.area}</td>
                <td className="meta">{ageLabel(l.ultimoContacto)}</td>
                <td style={{ textAlign: 'center' }}>
                  <button title="Eliminar lead" onClick={(e) => { e.stopPropagation(); actions.deleteLead(l.id); }}
                    style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 13, opacity: 0.5, padding: 2 }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)} onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.5)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pipeline({ leads, actions, view, setView }) {
  window.__ticket = actions.ticket;
  const [q, setQ] = upS('');
  const [fTemp, setFTemp] = upS(null);
  const [fVar, setFVar] = upS(null);
  const [fArea, setFArea] = upS(null);
  const [fStar, setFStar] = upS(false);

  const filtered = upM(() => leads.filter((l) => {
    if (fTemp && l.temperatura !== fTemp) return false;
    if (fVar && l.variante !== fVar) return false;
    if (fArea && l.area !== fArea) return false;
    if (fStar && !l.teInvito) return false;
    if (q && !((l.nombre || '').toLowerCase().includes(q.toLowerCase()) || (l.area || '').toLowerCase().includes(q.toLowerCase()) || (l.ciudad || '').toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [leads, q, fTemp, fVar, fArea, fStar]);

  const anyFilter = fTemp || fVar || fArea || fStar || q;

  return (
    <div className="screen-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* barra de control */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Segmented value={view} onChange={setView} options={[{ value: 'kanban', label: 'Kanban', icon: 'columns' }, { value: 'tabla', label: 'Tabla', icon: 'list' }]} />
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 300 }}>
          <Icon name="search" size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 32, height: 34 }} placeholder="Buscar por nombre, área o ciudad…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="meta" style={{ marginLeft: 'auto' }}>{filtered.length} de {leads.length}</span>
      </div>

      {/* filtros */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {PDATA.TEMPS.map((t) => <FilterPill key={t.id} label={`${t.emoji} ${t.label}`} color={t.color} active={fTemp === t.id} onClick={() => setFTemp((v) => v === t.id ? null : t.id)} />)}
        <span style={{ width: 1, height: 18, background: 'var(--line)' }} />
        {Object.keys(PDATA.VARIANTS).map((v) => <FilterPill key={v} label={v} active={fVar === v} onClick={() => setFVar((x) => x === v ? null : v)} />)}
        <span style={{ width: 1, height: 18, background: 'var(--line)' }} />
        <FilterPill label="⭐ Me invitó" color="var(--gold)" active={fStar} onClick={() => setFStar((v) => !v)} />
        <div style={{ width: 150 }}>
          <Select value={fArea} onChange={(v) => setFArea(v === '__all' ? null : v)} placeholder="Área" options={[{ value: '__all', label: 'Todas las áreas' }, ...PDATA.AREAS]} />
        </div>
        {anyFilter && <button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setFTemp(null); setFVar(null); setFArea(null); setFStar(false); }}>Limpiar</button>}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {filtered.length === 0
          ? <SectionCard><EmptyState emoji="🔍" title="Ningún lead con esos filtros" hint="Prueba a quitar algún filtro o a buscar otra cosa." /></SectionCard>
          : view === 'kanban'
            ? <Kanban leads={filtered} actions={actions} onDropStage={actions.dropStage} />
            : <Table leads={filtered} actions={actions} />}
      </div>
    </div>
  );
}

Object.assign(window, { Pipeline });
