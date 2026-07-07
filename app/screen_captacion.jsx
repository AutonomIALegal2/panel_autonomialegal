/* ══════════════════════════════════════════════════════════════════
   screen_captacion.jsx · CAPTACIÓN — el ciclo de invitaciones 🎯
   ══════════════════════════════════════════════════════════════════ */
const { useState: ucS } = React;

/* ── El ciclo tiene DOS fases separadas en el tiempo → dos prompts exactos.
   TODO (mejora futura, no implementar aún): cuando el CRM tenga datos reales,
   el marcador [PEGAR URLs] de ambos prompts se auto-rellenará con las URLs de
   los leads existentes para que el agente nunca proponga duplicados. */
const PROMPT_BUSCAR = `Actúa como mi agente de captación en LinkedIn, conectado a mi cuenta por navegador.

OBJETIVO: darme una tanda de 30-50 abogados/as españoles a los que enviar solicitud de conexión esta semana, sacados de MIS propias fuentes (no de una búsqueda genérica).

Trabaja UNA de estas dos fuentes (o ambas, en este orden):

FUENTE A — Mis likers y comentadores (empieza por aquí: son los más tibios):
1. Abre mis últimas 8-10 publicaciones.
2. Mira quién ha reaccionado o comentado en ellas.
3. Quédate con los que aún NO son conexión de 1er grado y encajen con el ICP.

FUENTE B — Mis seguidores:
1. Ve a mi perfil → pestaña "Seguidores".
2. Recórrela y filtra los que encajen con el ICP y no sean ya conexión.

ICP (estricto):
- INCLUIR por prioridad: (1) abogado/a ejerciente en ESPAÑA de laboral/penal/extranjería/civil con volumen; (2) dueño/autónomo o socio/director de despacho de 1-12 personas, cualquier área; (3) resto de áreas españolas.
- EXCLUIR: no-España, in-house de empresa, estudiantes/becarios, socios de firmas grandes (Cuatrecasas, Garrigues, Uría, ECIJA, Deloitte/PwC Legal), no-abogados (marketing, coaches, consultores IA, legaltech, académicos), procuradores.

Para CADA perfil apto: Nombre · URL · fuente (liker/seguidor) · encaje (ALTO/MEDIO) · área · ciudad · nota de invitación corta (máx 200 car., cálida, sin vender, reconociendo que sigue mi contenido; ej: "Muy buenas [Nombre]! Veo que sigues lo que comparto sobre gestión en despachos, te mando conexión para tener trato directo. Un saludo!") + variante "sin nota". Cero jerga. Nunca me presentes como abogado.

ENTREGABLE: tabla ordenada por encaje (ALTO primero), lista para que yo revise y envíe las solicitudes a mano. Dime el total y cuántos de cada fuente.

SEGURIDAD: no envíes ni automatices nada, solo recomiendas. Yo envío a mano, máx 15-20/día. Si LinkedIn muestra captcha o aviso, para y dímelo.

Excluye a los que ya están en mi sistema: [PEGAR URLs].`;

const PROMPT_PROCESAR = `Actúa como mi agente de captación en LinkedIn, conectado a mi cuenta por navegador. Vamos a convertir las solicitudes ACEPTADAS en leads listos para contactar.

PASO 1 — Revisar aceptaciones: entra en Mi red → conexiones recientes; identifica cuáles de mis solicitudes recientes han sido aceptadas desde la última vez. Excluye las URLs que te pego al final.
PASO 2 — Conversaciones vivas: si a alguno le envié nota y me respondió, lee la mini-conversación; su mensaje continúa esa conversación real.
PASO 3 — Clasificar y redactar el M1. Solo redactas mensaje para ESPAÑA (LatAm u otros: clasificados, mensaje vacío).

Framework del M1 (respétalo): NUNCA vende ni revela producto; destapa el dolor con UNA pregunta. ~200-280 caracteres, 3 bloques de una línea: (1) saludo + "Cómo va todo?"; (2) gancho real en una línea (su área/perfil, o la conversación si la hubo); (3) UNA pregunta de gestión ("los expedientes y plazos los llevas desde un mismo sitio, o cada cosa por su lado?"). Tono: NUNCA el signo ¿ de apertura; tuteo; nombre de pila; emoji puntual; humilde si retomo. Prohibido: jerga (CRM/leads), presentarme como abogado, mencionar producto / "lo construí" / "te lo enseño" / oferta, e inventar contexto.
Variantes A/B (alterna 50/50): A = angulo "C1 perfil" (gancho perfil + pregunta, opcional pincelada de autoridad); B = angulo "C2 conversacional" (curiosidad pura).

ENTREGABLE: CSV con estas 16 columnas exactas (RFC 4180, mensaje entre comillas con saltos reales):
prioridad,nombre,tipo,pais,ciudad,perfil,area,temperatura,framework,variante,angulo,ultimo_contacto,te_invito,conecto_el,url,mensaje
- temperatura: FRIO (aceptó sin conversación) / TEMPLADO (cortesía) / CALIENTE (conversación real). framework: C. te_invito: SI si la solicitud la envió él/ella. conecto_el: fecha de aceptación. mensaje vacío si pais≠España.

SEGURIDAD: no envíes nada, solo preparas; los M1 los envío yo desde el CRM. Excluye los ya en mi CRM: [PEGAR URLs].`;

const PROMPTS = {
  buscar:   { title: 'Buscar a quién invitar 🔎', subtitle: 'Te devolverá la lista de a quién invitar.', text: PROMPT_BUSCAR },
  procesar: { title: 'Procesar aceptaciones → importar 📥', subtitle: 'Te devolverá el CSV listo para importar.', text: PROMPT_PROCESAR },
};

function CycleModal({ kind, onClose }) {
  const [copied, setCopied] = ucS(false);
  const p = PROMPTS[kind] || PROMPTS.buscar;
  return (
    <Modal title={p.title} subtitle={p.subtitle} onClose={onClose} width={600}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        <Button variant="gold" icon={copied ? 'check' : 'copy'} onClick={() => { copyText(p.text); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>{copied ? 'Copiado' : 'Copiar prompt'}</Button>
      </>}>
      <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-2)', background: 'var(--field-bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '13px 15px', whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)' }}>
        {p.text}
      </div>
      <div style={{ marginTop: 11, display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 11.5, color: 'var(--text-4)' }}>
        <Icon name="alert" size={13} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 1 }} />
        <span>Sustituye <code style={{ color: 'var(--gold-bright)' }}>[PEGAR URLs]</code> por las URLs de los leads que ya tienes, para que el agente no proponga duplicados.</span>
      </div>
    </Modal>
  );
}

function CycleBar({ c, maxRate }) {
  const acc = rate(c.aceptadas, c.enviadas);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ width: 74, flexShrink: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{fmtDate(c.fecha)}</div>
        <div className="meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 74 }} title={c.nota}>{c.nota}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div className="hbar-track" style={{ height: 20 }}>
          <div className="hbar-fill" style={{ width: (acc / maxRate) * 100 + '%', background: 'linear-gradient(90deg,var(--gold-deep),var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 7 }}>
            <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: '#1a1406' }}>{acc.toFixed(0)}%</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
        <MiniStat label="Enviadas" value={c.enviadas} />
        <MiniStat label="Aceptadas" value={c.aceptadas} />
        <MiniStat label="Importados" value={c.importados} />
      </div>
    </div>
  );
}

function NewCycleForm({ onAdd, onImport, onProcess }) {
  const [f, setF] = ucS({ recomendados: '', enviadas: '', aceptadas: '', importados: '', nota: '' });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = () => {
    if (!f.enviadas) return;
    onAdd({ id: 'c' + Date.now(), fecha: PDATA.TODAY, recomendados: +f.recomendados || +f.enviadas, enviadas: +f.enviadas, aceptadas: +f.aceptadas || 0, importados: +f.importados || 0, nota: f.nota || 'Ciclo nuevo' });
    setF({ recomendados: '', enviadas: '', aceptadas: '', importados: '', nota: '' });
  };
  return (
    <div className="card card-hair" style={{ padding: 16 }}>
      <h3 className="h-sec" style={{ marginBottom: 14 }}>Registrar ciclo nuevo</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
        <Field label="Recomendados"><Input type="number" value={f.recomendados} onChange={(e) => set('recomendados', e.target.value)} placeholder="60" /></Field>
        <Field label="Solicitudes"><Input type="number" value={f.enviadas} onChange={(e) => set('enviadas', e.target.value)} placeholder="55" /></Field>
        <Field label="Aceptadas"><Input type="number" value={f.aceptadas} onChange={(e) => set('aceptadas', e.target.value)} placeholder="20" /></Field>
        <Field label="Importados"><Input type="number" value={f.importados} onChange={(e) => set('importados', e.target.value)} placeholder="18" /></Field>
      </div>
      <Field label="Nota"><Input value={f.nota} onChange={(e) => set('nota', e.target.value)} placeholder="Foco del ciclo (áreas, zona…)" /></Field>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button variant="default" icon="sparkles" onClick={onProcess}>Procesar aceptaciones → importar</Button>
        <Button variant="default" icon="upload" onClick={onImport}>Importar CSV del agente</Button>
        <Button variant="gold" icon="plus" onClick={submit}>Registrar ciclo</Button>
      </div>
    </div>
  );
}

function Captacion({ leads, cycles, addCycle, config, onImport, openPrompt }) {
  const ammo = ammoStatus(leads, config.objetivoDiario, config.umbralMunicion);
  const maxRate = Math.max(...cycles.map((c) => rate(c.aceptadas, c.enviadas)), 1) * 1.1;
  // ritmo de reposición: importados / semanas cubiertas
  const totalImport = cycles.reduce((s, c) => s + c.importados, 0);
  const spanDays = cycles.length > 1 ? Math.abs(daysFromToday(cycles[cycles.length - 1].fecha)) : 7;
  const perWeek = (totalImport / Math.max(1, spanDays / 7)).toFixed(1);
  const tierMeta = { ok: ['var(--green)', 'Cola sana'], warn: ['var(--amber)', 'Vigila la cola'], crit: ['var(--hot)', 'Sin munición pronto'] }[ammo.tier];

  return (
    <div className="screen-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960, margin: '0 auto' }}>
      {/* cargador de munición */}
      <div className="card card-hair" style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center', borderColor: ammo.tier === 'crit' ? 'var(--hot)' : 'var(--line)' }}>
        <div>
          <div className="rail-lbl" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>🔫 Cargador de munición</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 4px' }}>
            <span className="serif tnum" style={{ fontSize: 38, fontWeight: 600, color: tierMeta[0], lineHeight: 1 }}>{ammo.dias.toFixed(1)}</span>
            <span style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 550 }}>días de cola · {ammo.pendientes} pendientes</span>
          </div>
          <div style={{ marginTop: 12, marginBottom: 6 }}><AmmoMagazine total={ammo.pendientes} perDay={config.objetivoDiario} max={28} tone={tierMeta[0]} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <span className="pill" style={{ color: tierMeta[0], background: 'color-mix(in srgb,' + tierMeta[0] + ' 15%, transparent)' }}><span className="dot" />{tierMeta[1]}</span>
            <span className="meta">Verde &gt;7 · ámbar 4-7 · rojo &lt;3 días</span>
          </div>
        </div>
        <AmmoMagazine total={ammo.pendientes} perDay={config.objetivoDiario} max={28} />
      </div>

      {/* el ciclo en dos fases */}
      <SectionCard title="El ciclo, en dos fases" emoji="🎯" right={<span className="meta">separadas en el tiempo</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 0 }}>
          <div style={{ padding: '16px 18px', borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent-bright)' }}>Fase 1</span>
              <span style={{ fontSize: 14, fontWeight: 650 }}>🔎 A quién invitar</span>
            </div>
            <p className="meta" style={{ margin: '0 0 12px', lineHeight: 1.5 }}>El agente rastrea tus likers y seguidores y te devuelve la lista de a quién enviar solicitud. Tú las envías a mano.</p>
            <Button variant="gold" icon="search" onClick={() => openPrompt('buscar')}>Buscar a quién invitar</Button>
          </div>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent-bright)' }}>Fase 2</span>
              <span style={{ fontSize: 14, fontWeight: 650 }}>📥 Procesar aceptaciones</span>
            </div>
            <p className="meta" style={{ margin: '0 0 12px', lineHeight: 1.5 }}>Días después, cuando ya han aceptado, el agente convierte las conexiones en leads con su M1 y te devuelve el CSV listo para importar.</p>
            <Button variant="gold" icon="sparkles" onClick={() => openPrompt('procesar')}>Procesar aceptaciones → importar</Button>
          </div>
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <div className="card" style={{ padding: 15 }}><StatBig value={cycles.length} label="Ciclos registrados" size={28} /></div>
        <div className="card" style={{ padding: 15 }}><StatBig value={+perWeek} label="Importados / semana" sub="ritmo de reposición" color="var(--gold-bright)" size={28} format={(n) => n.toLocaleString('es-ES')} /></div>
        <div className="card" style={{ padding: 15 }}><StatBig value={rate(cycles.reduce((s, c) => s + c.aceptadas, 0), cycles.reduce((s, c) => s + c.enviadas, 0))} label="Tasa de aceptación media" color="var(--gold-bright)" size={28} format={(n) => n.toFixed(0) + '%'} /></div>
      </div>

      <SectionCard title="Ciclos del agente" emoji="🔄" count={cycles.length} right={<span className="meta">tasa de aceptación por ciclo</span>}>
        <div style={{ padding: '4px 16px 12px' }}>
          {cycles.map((c) => <CycleBar key={c.id} c={c} maxRate={maxRate} />)}
        </div>
      </SectionCard>

      <NewCycleForm onAdd={addCycle} onImport={onImport} onProcess={() => openPrompt('procesar')} />
    </div>
  );
}

Object.assign(window, { Captacion, CycleModal });
