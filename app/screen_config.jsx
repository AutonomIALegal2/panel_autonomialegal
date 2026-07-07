/* ══════════════════════════════════════════════════════════════════
   screen_config.jsx · CONFIG ⚙️ + import/export (CSV RFC4180 / JSON)
   ══════════════════════════════════════════════════════════════════ */
const { useState: ugS, useRef: ugR } = React;

/* Parser CSV RFC 4180 (comillas, comas y saltos de línea dentro de campos) */
function parseCSV(text) {
  const rows = []; let row = []; let field = ''; let i = 0; let inQ = false;
  text = text.replace(/^\uFEFF/, ''); // BOM
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((x) => x.trim() !== '')).map((r) => {
    const o = {}; header.forEach((h, idx) => { o[h] = (r[idx] || '').trim(); }); return o;
  });
}

/* Fila CSV → lead del panel (dedupe por URL lo hace el llamador) */
function csvRowToLead(o, i) {
  const temp = (o.temperatura || 'FRIO').toUpperCase();
  const t = PDATA.temp(temp) || PDATA.temp('FRIO');
  const variante = (o.variante || (t.fw + '1')).toUpperCase();
  const vmeta = PDATA.VARIANTS[variante];
  return {
    id: 'imp' + Date.now() + i,
    prioridad: +o.prioridad || 3, nombre: o.nombre || 'Sin nombre', tipo: o.tipo || 'Abogado/a',
    pais: o.pais || 'España', ciudad: o.ciudad || '—', perfil: o.perfil || `— · ${o.area || ''}`,
    area: o.area || 'Civil', temperatura: temp, framework: t.fw, variante,
    angulo: o.angulo || (vmeta ? vmeta.angulo : '—'),
    ultimoContacto: o.ultimo_contacto || PDATA.TODAY, teInvito: /^(si|sí|true|1|x)$/i.test(o.te_invito || ''),
    conectoEl: o.conecto_el || PDATA.TODAY, url: o.url || '', mensaje: o.mensaje || (PDATA.M1_TPL[variante] ? PDATA.M1_TPL[variante]((o.nombre || '').split(' ')[0], o.area || '', o.ciudad || '') : ''),
    stage: 'pendiente', fuCount: 0, replyType: null, repliedAt: null, m1Date: null, altered: false,
    qualif: null, nextStep: null, snoozeUntil: null, lostReason: null, notas: '',
    messages: [], events: [{ ts: PDATA.now(9, 0), kind: 'import', text: 'Importado del ciclo' }], captures: [],
  };
}

function download(name, text, type = 'application/json') {
  const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ConfigRow({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {hint && <div className="meta" style={{ marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}
function NumberBox({ value, onChange, min = 0, suffix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input className="input tnum" type="number" min={min} value={value} onChange={(e) => onChange(Math.max(min, +e.target.value || 0))} style={{ width: 92, textAlign: 'right' }} />
      {suffix && <span className="meta">{suffix}</span>}
    </div>
  );
}
function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={on}
      style={{ position: 'relative', width: 44, height: 25, borderRadius: 99, border: 'none', background: on ? 'var(--gold)' : 'var(--line-strong)', transition: 'background var(--dur-fast) var(--ease)' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 22 : 3, width: 19, height: 19, borderRadius: 99, background: '#fff', transition: 'left var(--dur-fast) var(--ease)', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }} />
    </button>
  );
}

function Configuracion({ config, setConfig, onImportCSV, onImportJSON, onExport, stats }) {
  const csvRef = ugR(null); const jsonRef = ugR(null);
  const [bumps, setBumps] = ugS(config.bumps);
  const saveBumps = (i, v) => { const next = bumps.slice(); next[i] = v; setBumps(next); setConfig({ bumps: next }); };

  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760, margin: '0 auto' }}>
      <SectionCard title="Objetivos y dinero" emoji="🎯">
        <div style={{ padding: '4px 16px 12px' }}>
          <ConfigRow label="Objetivo diario de envíos" hint="Cuántos primeros mensajes te propones al día">
            <NumberBox value={config.objetivoDiario} onChange={(v) => setConfig({ objetivoDiario: v })} min={1} suffix="M1/día" />
          </ConfigRow>
          <ConfigRow label="Ticket medio" hint="Alimenta el contador 💰 de pasta en juego">
            <NumberBox value={config.ticketMedio} onChange={(v) => setConfig({ ticketMedio: v })} suffix="€/mes" />
          </ConfigRow>
          <ConfigRow label="Umbral de alarma de munición" hint="Salta el aviso cuando la cola baja de estos días">
            <NumberBox value={config.umbralMunicion} onChange={(v) => setConfig({ umbralMunicion: v })} min={1} suffix="días" />
          </ConfigRow>
        </div>
      </SectionCard>

      <SectionCard title="Follow-ups (framework Hormozi)" emoji="↩️" right={<span className="meta">máx. 3, uno al día</span>}>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bumps.map((b, i) => (
            <Field key={i} label={`Bump ${i + 1} · FU${i + 1}`}>
              <Textarea value={b} onChange={(e) => saveBumps(i, e.target.value)} rows={2} />
              <span className="meta" style={{ display: 'block', marginTop: 4 }}>Usa <code style={{ color: 'var(--gold-bright)' }}>{'{f}'}</code> para el nombre de pila.</span>
            </Field>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Apariencia" emoji="🎨">
        <div style={{ padding: '4px 16px 12px' }}>
          <ConfigRow label="Modo humor" hint="Confeti, frases con gracia y estados vacíos divertidos. Apágalo para enseñar la pantalla en una llamada (modo serio).">
            <Toggle on={config.humor} onChange={(v) => setConfig({ humor: v })} />
          </ConfigRow>
          <ConfigRow label="Tema" hint="Oscuro por defecto; el claro también queda digno.">
            <Segmented value={config.theme} onChange={(v) => setConfig({ theme: v })} options={[{ value: 'dark', label: 'Oscuro', icon: 'moon' }, { value: 'light', label: 'Claro', icon: 'sun' }]} />
          </ConfigRow>
        </div>
      </SectionCard>

      <SectionCard title="Datos · importar y exportar" emoji="📥">
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = () => onImportCSV(r.result); r.readAsText(f); } e.target.value = ''; }} />
          <input ref={jsonRef} type="file" accept=".json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = () => { try { onImportJSON(JSON.parse(r.result)); } catch (x) { alert('JSON no válido'); } }; r.readAsText(f); } e.target.value = ''; }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="default" icon="upload" onClick={() => csvRef.current.click()}>Importar CSV de leads</Button>
            <span className="meta">Cabecera RFC 4180 · dedupe por URL sin machacar estados</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="default" icon="upload" onClick={() => jsonRef.current.click()}>Importar respaldo JSON</Button>
            <Button variant="gold" icon="download" onClick={onExport}>Exportar todo a JSON</Button>
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
            <MiniStat label="Leads" value={stats.leads} />
            <MiniStat label="Ciclos" value={stats.cycles} />
            <MiniStat label="Mensajes" value={stats.messages} />
          </div>
        </div>
      </SectionCard>

      <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-4)' }} onClick={() => { if (confirm('¿Restablecer todos los datos de ejemplo? Se perderán tus cambios locales.')) { ['leads', 'cycles', 'bitacora', 'config', 'daily'].forEach((k) => localStorage.removeItem('panel-' + k)); location.reload(); } }}>
          Restablecer datos de ejemplo
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { Configuracion, parseCSV, csvRowToLead, download });
