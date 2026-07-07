/* ══════════════════════════════════════════════════════════════════
   screen_embudo.jsx · EMBUDO & SEÑALES 📊
   ══════════════════════════════════════════════════════════════════ */
const { useState: ueS } = React;
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function FunnelPipe({ steps }) {
  const top = steps[0].n || 1;
  return (
    <div className="card card-hair" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <h3 className="h-sec">La tubería del dinero</h3>
        <span className="meta">M1 → cliente · % de paso entre etapas</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 16 }}>
        {steps.map((s, i) => {
          const w = 30 + (s.n / top) * 70;
          const last = i === steps.length - 1;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 96, textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: last ? 'var(--green-bright)' : 'var(--text-2)' }}>{s.label}</div>
                <div className="meta tnum">{s.ofTop.toFixed(0)}% del total</div>
              </div>
              <div style={{ flex: 1, position: 'relative', height: 40 }}>
                <div className="pipe-flow" style={{
                  width: w + '%', height: '100%', borderRadius: 'var(--r-sm)',
                  background: last
                    ? 'linear-gradient(90deg, var(--green-deep), var(--green-bright))'
                    : `linear-gradient(90deg, color-mix(in srgb, var(--gold) ${30 + i * 8}%, var(--accent)), color-mix(in srgb, var(--gold-bright) ${30 + i * 8}%, var(--accent)))`,
                  display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 8,
                  boxShadow: last ? 'var(--glow-green)' : 'none', transition: 'width .6s var(--ease)',
                }}>
                  <span className="serif tnum" style={{ fontSize: 20, fontWeight: 600, color: '#1a1406' }}>{s.n}</span>
                  {last && <span style={{ fontSize: 15 }}>💰</span>}
                </div>
              </div>
              <div style={{ width: 54, flexShrink: 0 }}>
                {i > 0 && <span className="pill tnum" style={{ height: 20, background: s.pct >= 40 ? 'var(--green-dim)' : 'var(--field-bg)', color: s.pct >= 40 ? 'var(--green)' : 'var(--text-3)' }}>{s.pct.toFixed(0)}%</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SignalCut({ title, rows, benchmark = 20 }) {
  const max = Math.max(benchmark, ...rows.map((r) => r.rate), 1);
  return (
    <div className="card card-hair" style={{ padding: 16 }}>
      <h3 className="h-sec" style={{ marginBottom: 14 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {rows.map((r) => {
          const small = r.n < 10;
          return (
            <div key={r.key} style={{ opacity: small ? 0.5 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 550 }}>{r.key}</span>
                <span className="tnum" style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: r.rate >= benchmark ? 'var(--green)' : 'var(--text)' }}>{r.rate.toFixed(0)}%</span>
                <span className="meta tnum" style={{ width: 30, textAlign: 'right' }}>n={r.n}</span>
              </div>
              <div className="hbar-track" style={{ height: 8, position: 'relative' }}>
                <div className="hbar-fill" style={{ width: (r.rate / max) * 100 + '%', background: r.rate >= benchmark ? 'linear-gradient(90deg,var(--green),var(--green-bright))' : 'var(--accent)' }} />
                <div title="Benchmark 20%" style={{ position: 'absolute', top: -2, bottom: -2, left: (benchmark / max) * 100 + '%', width: 2, background: 'var(--gold)', opacity: .8 }} />
              </div>
              {small && <div style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 3 }}>muestra pequeña</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bitacora({ notes, onAdd }) {
  const [draft, setDraft] = ueS('');
  return (
    <div className="card card-hair" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 15 }}>📓</span>
        <h3 className="h-sec">Bitácora semanal</h3>
        <span className="meta">la nota del viernes</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input className="input" placeholder="¿Qué te ha enseñado esta semana?" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { onAdd(draft.trim()); setDraft(''); } }} />
        <Button variant="accent" icon="plus" onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(''); } }}>Anotar</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notes.map((n) => (
          <div key={n.id} style={{ borderLeft: '2px solid var(--gold-line)', paddingLeft: 12 }}>
            <div className="meta" style={{ marginBottom: 2 }}>{fmtDateY(n.fecha)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{n.texto}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Embudo({ leads, bitacora, addNote }) {
  const steps = funnel(leads);
  const byArea = cutBy(leads, (l) => l.area);
  const byTemp = cutBy(leads, (l) => { const t = PDATA.temp(l.temperatura); return t ? `${t.emoji} ${t.label}` : null; });
  const byStar = cutBy(leads, (l) => l.teInvito ? '⭐ Me invitó' : 'Conexión en frío');
  const byDay = cutBy(leads, (l) => l.m1Date ? WEEKDAYS[new Date(l.m1Date + 'T12:00:00').getDay()] : null);
  const byPerfil = cutBy(leads, (l) => (l.perfil || '').split(' · ')[0]);
  const byOrigen = cutBy(leads, (l) => { const o = origenMeta(l.origen || 'linkedin'); return `${o.emoji} ${o.label}`; });

  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
      <FunnelPipe steps={steps} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 4 }}>
        <span className="rail-lbl">Cortes de positive reply rate</span>
        <span className="meta">línea dorada = benchmark 20% (Hormozi)</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
        <SignalCut title="Por origen" rows={byOrigen} />
        <SignalCut title="Por temperatura" rows={byTemp} />
        <SignalCut title="Por área" rows={byArea} />
        <SignalCut title="Por invitación (⭐)" rows={byStar} />
        <SignalCut title="Por perfil" rows={byPerfil} />
        <SignalCut title="Por día de envío" rows={byDay} />
      </div>
      <Bitacora notes={bitacora} onAdd={addNote} />
    </div>
  );
}

Object.assign(window, { Embudo });
