/* ══════════════════════════════════════════════════════════════════
   screen_lab.jsx · LABORATORIO A/B 🧪
   ══════════════════════════════════════════════════════════════════ */

function BranchBar({ label, meta, positivas, madurados, best }) {
  const r = rate(positivas, madurados);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 6 }}>
        <span className="badge mono" style={{ background: best ? 'var(--green-dim)' : 'var(--field-bg)', color: best ? 'var(--green)' : 'var(--text-2)' }}>{label}</span>
        <span className="meta">{meta.angulo}</span>
        {best && <span title="Va por delante" style={{ marginLeft: 'auto', fontSize: 13 }}>👑</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="serif tnum" style={{ fontSize: 30, fontWeight: 600, color: best ? 'var(--green-bright)' : 'var(--text)', lineHeight: 1 }}>{r.toFixed(1).replace('.', ',')}%</span>
        <span className="meta">positive reply</span>
      </div>
      <div className="hbar-track" style={{ marginTop: 8, height: 8 }}>
        <div className="hbar-fill" style={{ width: Math.min(100, r * 2.2) + '%', background: best ? 'linear-gradient(90deg,var(--green),var(--green-bright))' : 'var(--line-strong)' }} />
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 9 }}>
        <MiniStat label="Enviados" value={meta.enviados} />
        <MiniStat label="Madurados" value={madurados} hint="≥7 días" />
        <MiniStat label="Positivas" value={positivas} />
      </div>
    </div>
  );
}
function MiniStat({ label, value, hint }) {
  return <div>
    <div className="tnum" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
    <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{label}{hint ? ` · ${hint}` : ''}</div>
  </div>;
}

function FrameworkCard({ fw, stats }) {
  const A = stats[fw.a], B = stats[fw.b];
  const sig = abSignificance(A, B);
  const meta = SIG_META[sig.tier];
  const aBest = rate(A.positivas, A.madurados) >= rate(B.positivas, B.madurados);
  const t = PDATA.temp(fw.temp);
  return (
    <div className="card card-hair" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
        <span style={{ fontSize: 16 }}>{t.emoji}</span>
        <h3 className="h-sec" style={{ fontSize: 14 }}>{fw.label} · rama {fw.id}</h3>
        <span className="pill" style={{ marginLeft: 'auto', background: 'color-mix(in srgb,' + meta.color + ' 15%, transparent)', color: meta.color }}>
          {meta.dot} {meta.label} · p={sig.p < 0.001 ? '<0,001' : sig.p.toFixed(3).replace('.', ',')}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
        <BranchBar label={fw.a} meta={{ ...A, angulo: PDATA.VARIANTS[fw.a].angulo }} positivas={A.positivas} madurados={A.madurados} best={aBest} />
        <div style={{ width: 1, background: 'var(--line)', alignSelf: 'stretch' }} />
        <BranchBar label={fw.b} meta={{ ...B, angulo: PDATA.VARIANTS[fw.b].angulo }} positivas={B.positivas} madurados={B.madurados} best={!aBest} />
      </div>
      {sig.tier === 'insuficiente' && (
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 7, alignItems: 'center' }}>
          <Icon name="alert" size={13} style={{ color: 'var(--amber)' }} /> Muestra pequeña. Sigue enviando antes de decidir esta rama.
        </div>
      )}
    </div>
  );
}

function TouchChart({ data }) {
  const labels = ['A la 1ª', 'Tras FU1', 'Tras FU2', 'Tras FU3'];
  const max = Math.max(1, ...data.map((d) => d.rate));
  return (
    <div className="card card-hair" style={{ padding: 18 }}>
      <h3 className="h-sec" style={{ marginBottom: 4 }}>Respuesta según nº de toque</h3>
      <p className="meta" style={{ marginBottom: 18 }}>Cuánto responde la gente a la 1ª frente a después de cada follow-up.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, alignItems: 'end', height: 150 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
            <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-bright)' }}>{d.rate.toFixed(0)}%</span>
            <div style={{ width: '70%', maxWidth: 54, height: Math.max(4, (d.rate / max) * 110), borderRadius: '5px 5px 0 0', background: 'linear-gradient(180deg, var(--gold), var(--gold-deep))' }} />
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 550, textAlign: 'center' }}>{labels[i]}</span>
            <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{d.replied}/{d.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── A/B de follow-ups: formato A (suave) vs B (directo), medido POR TOQUE ── */
function FuAbCard({ leads }) {
  const s = fuAbStats(leads);
  const total = s.A.enviados + s.B.enviados;
  const best = total && s.A.enviados && s.B.enviados
    ? (s.A.rate === s.B.rate ? null : (s.A.rate > s.B.rate ? 'A' : 'B'))
    : null;
  const Row = ({ v, data }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr auto', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
      <span className="pill" style={{ fontWeight: 700, justifySelf: 'start',
        background: v === 'B' ? 'var(--cold-bg)' : 'var(--gold-dim)',
        color: v === 'B' ? 'var(--cold)' : 'var(--gold-bright)' }}>
        Formato {v}{best === v ? ' 👑' : ''}
      </span>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--field-bg)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, data.rate)}%`, borderRadius: 99,
          background: v === 'B' ? 'var(--cold)' : 'linear-gradient(90deg, var(--gold), var(--gold-deep))' }} />
      </div>
      <span className="meta tnum"><b style={{ color: 'var(--text)', fontSize: 14 }}>{data.rate.toFixed(0)}%</b> · {data.respuestas}/{data.enviados}</span>
    </div>
  );
  return (
    <div className="card card-hair" style={{ padding: 18 }}>
      <h3 className="h-sec" style={{ marginBottom: 4 }}>A/B de follow-ups · formato A vs B</h3>
      <p className="meta" style={{ marginBottom: 12 }}>
        A = suave/conversacional · B = directo al deseo. Medido <b>por toque</b>: un formato se apunta la respuesta si fue el último follow-up antes de que el lead contestara.
      </p>
      {total === 0
        ? <p className="meta" style={{ padding: '8px 0' }}>Aún sin follow-ups del test. Los FU enviados desde hoy llevan su formato (🧪 A/B) y aparecerán aquí.</p>
        : (<>
            <Row v="A" data={s.A} />
            <Row v="B" data={s.B} />
            {s.porToque.length > 0 && (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
                {s.porToque.map((t) => (
                  <span key={t.key} className="meta tnum" style={{ background: 'var(--field-bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '4px 9px' }}>
                    {t.key} → {t.rate.toFixed(0)}% ({t.respuestas}/{t.enviados})
                  </span>
                ))}
              </div>
            )}
          </>)}
    </div>
  );
}

function LabAB({ leads }) {
  const stats = abStats(leads);
  const touch = touchBreakdown(leads);
  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 920, margin: '0 auto' }}>
      <div className="card" style={{ padding: '13px 16px', display: 'flex', gap: 11, alignItems: 'center', background: 'var(--panel-2)', borderColor: 'var(--line-md)' }}>
        <span style={{ fontSize: 17 }}>🧪</span>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
          <b style={{ color: 'var(--text)' }}>Regla de decisión:</b> no cambies el ángulo hasta tener <b>≥80 madurados por rama</b> y <b>≥8 puntos</b> de diferencia. Los leads con copy alterado quedan fuera del test.
        </div>
      </div>

      {PDATA.FRAMEWORKS.map((fw) => <FrameworkCard key={fw.id} fw={fw} stats={stats} />)}

      <FuAbCard leads={leads} />

      <TouchChart data={touch} />
    </div>
  );
}

Object.assign(window, { LabAB });
