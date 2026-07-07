/* ══════════════════════════════════════════════════════════════════
   screen_tareas.jsx · TAREAS de captación (generales, sin expediente).
   ══════════════════════════════════════════════════════════════════ */
const { useState: utS } = React;

const PRIO_COLOR = { alta: 'var(--hot)', media: 'var(--gold)', baja: 'var(--text-3)' };
const PRIO_LABEL = { alta: 'Alta', media: 'Media', baja: 'Baja' };

function TaskRow({ t, actions, done }) {
  const overdue = !done && t.due_date && t.due_date < PDATA.TODAY;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 15px', borderBottom: '1px solid var(--line)' }}>
      <button onClick={() => actions.toggleTask(t.id)} title={done ? 'Reabrir' : 'Marcar hecha'}
        style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid ' + (done ? 'var(--green)' : 'var(--line-strong)'), background: done ? 'var(--green)' : 'transparent', cursor: 'pointer', flexShrink: 0, color: '#fff', fontSize: 12, lineHeight: 1, display: 'grid', placeItems: 'center' }}>
        {done ? '✓' : ''}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: done ? 'var(--text-3)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>{t.title}</div>
        {t.due_date && <div className="meta" style={{ color: overdue ? 'var(--danger)' : 'var(--text-3)', marginTop: 2 }}>{overdue ? '⚠️ Venció ' : '📅 Vence '}{fmtDate(t.due_date)}</div>}
      </div>
      {!done && <span className="pill" style={{ height: 20, color: PRIO_COLOR[t.priority], background: 'var(--field-bg)' }}>{PRIO_LABEL[t.priority] || t.priority}</span>}
      <button title="Eliminar" onClick={() => actions.deleteTask(t.id)}
        style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 12, opacity: 0.5, padding: 2 }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)} onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.5)}>🗑️</button>
    </div>
  );
}

function Tareas({ tasks, actions }) {
  const [title, setTitle] = utS('');
  const [due, setDue] = utS('');
  const [prio, setPrio] = utS('media');

  const add = () => {
    if (!title.trim()) return;
    actions.addTask({ title: title.trim(), due_date: due || null, priority: prio });
    setTitle(''); setDue(''); setPrio('media');
  };

  const pend = tasks.filter((t) => !t.completed_at)
    .sort((a, b) => ((a.due_date || '9999-99-99') < (b.due_date || '9999-99-99') ? -1 : 1));
  const done = tasks.filter((t) => t.completed_at);

  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760, margin: '0 auto' }}>
      <div className="card" style={{ padding: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ flex: 1, minWidth: 220, height: 36 }} placeholder="Nueva tarea de captación…"
          value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
        <input type="date" className="input" style={{ height: 36 }} value={due} min={PDATA.TODAY} onChange={(e) => setDue(e.target.value)} />
        <div className="seg">
          {['alta', 'media', 'baja'].map((p) => (
            <button key={p} className={`seg-btn${prio === p ? ' active' : ''}`} onClick={() => setPrio(p)}>{PRIO_LABEL[p]}</button>
          ))}
        </div>
        <Button variant="gold" onClick={add}>Añadir</Button>
      </div>

      <SectionCard title="Pendientes" emoji="📋" count={pend.length}>
        {pend.length === 0
          ? <EmptyState emoji="✅" title="Sin tareas pendientes" hint="Añade una arriba: seguir a X, preparar tanda, revisar respuestas…" />
          : pend.map((t) => <TaskRow key={t.id} t={t} actions={actions} />)}
      </SectionCard>

      {done.length > 0 && (
        <SectionCard title="Hechas" emoji="✔️" count={done.length}>
          {done.map((t) => <TaskRow key={t.id} t={t} actions={actions} done />)}
        </SectionCard>
      )}
    </div>
  );
}

Object.assign(window, { Tareas });
