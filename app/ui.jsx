/* ══════════════════════════════════════════════════════════════════
   ui.jsx · biblioteca de componentes compartidos + widgets "dinero".
   ══════════════════════════════════════════════════════════════════ */
const { useState: usS, useEffect: usE, useRef: usR, useCallback: usC } = React;

/* ── Botón ── */
function Button({ variant = 'default', size, icon, iconRight, children, className = '', ...rest }) {
  const cls = ['btn', variant !== 'default' && `btn-${variant}`, size && `btn-${size}`, className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 15} />}
      {children}
      {iconRight && <Icon name={iconRight} size={15} />}
    </button>
  );
}
function IconButton({ name, size = 16, title, active, className = '', ...rest }) {
  return (
    <button className={`icon-btn${active ? ' active' : ''} ${className}`} title={title} aria-label={title} {...rest}>
      <Icon name={name} size={size} />
    </button>
  );
}

/* ── Campos ── */
function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span style={{ display: 'block', marginTop: 5, fontSize: 11.5, color: 'var(--text-4)' }}>{hint}</span>}
    </label>
  );
}
function Input(props) { return <input className="input" {...props} />; }
function Textarea(props) { return <textarea className="textarea" {...props} />; }

function Select({ value, onChange, options, placeholder = 'Selecciona…', width }) {
  const [open, setOpen] = usS(false);
  const ref = usR(null);
  usE(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h, true);
    return () => document.removeEventListener('mousedown', h, true);
  }, [open]);
  const norm = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const sel = norm.find((o) => o.value === value);
  return (
    <div ref={ref} style={{ position: 'relative', width: width || '100%' }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 34, padding: '0 11px', background: 'var(--field-bg)', border: '1px solid var(--line-md)', borderRadius: 'var(--r-sm)', color: sel ? 'var(--text)' : 'var(--text-4)', fontSize: 13.5 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel ? sel.label : placeholder}</span>
        <Icon name="chevronsUpDown" size={13} style={{ color: 'var(--text-3)' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 50, maxHeight: 260, overflowY: 'auto', background: 'var(--panel-2)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-pop)', padding: 4 }}>
          {norm.map((o) => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', borderRadius: 'var(--r-xs)', fontSize: 13, cursor: 'pointer', color: o.value === value ? 'var(--text)' : 'var(--text-2)', background: o.value === value ? 'var(--hover)' : 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = o.value === value ? 'var(--hover)' : 'transparent'}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
              {o.value === value && <Icon name="check" size={13} style={{ color: 'var(--gold-bright)' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value}
          className={`seg-btn${value === o.value ? ' active' : ''}`} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={13} />}{o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Pills & badges ── */
function Pill({ children, color = 'var(--text-2)', bg = 'var(--field-bg)', dot = false, border, style }) {
  return <span className="pill" style={{ color, background: bg, borderColor: border || 'transparent', ...style }}>
    {dot && <span className="dot" />}{children}</span>;
}
function TempBadge({ id, size = 'md' }) {
  const t = PDATA.temp(id); if (!t) return null;
  return <span className="pill" style={{ color: t.color, background: t.bg, height: size === 'sm' ? 20 : 22, fontSize: size === 'sm' ? 10.5 : 11 }}>
    <span style={{ fontSize: 11 }}>{t.emoji}</span>{t.label}</span>;
}
function VariantBadge({ v, altered }) {
  return <span className="badge mono" title={altered ? 'Copy alterado · excluido del A/B' : `Variante ${v}`}
    style={{ color: altered ? 'var(--text-3)' : 'var(--accent-bright)', background: altered ? 'var(--neutral-bg)' : 'var(--accent-dim)', textDecoration: altered ? 'line-through' : 'none' }}>
    {v}{altered && ' ✎'}</span>;
}
function StarBadge() {
  return <span title="Me invitó él/ella a conectar" style={{ fontSize: 13, color: 'var(--gold-bright)' }}>⭐</span>;
}
function MaturityDot({ stage, size = 15 }) {
  const m = maturity(stage);
  return <span title={`Cosecha · ${m.label}`} style={{ fontSize: size }}>{m.emoji}</span>;
}
function StageBadge({ stage }) {
  const e = PDATA.etapa(stage); if (!e) return null;
  return <span className="pill" style={{ color: e.color, background: 'color-mix(in srgb, ' + e.color + ' 15%, transparent)' }}>
    <span className="dot" style={{ background: e.color }} />{e.short}</span>;
}

/* ── Contador tragaperras (dígitos que ruedan) ── */
function AnimatedNumber({ value, className = '', style, format = fmtNum, duration = 900 }) {
  const [display, setDisplay] = usS(value);
  const fromRef = usR(value);
  const rafRef = usR(null);
  usE(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) { setDisplay(to); return; }
    const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return <span className={className} style={style}>{format(display)}</span>;
}

/* ── Anillo de progreso (hucha de envíos) ── */
function ProgressRing({ value, max, size = 116, stroke = 10, color = 'var(--gold)', track = 'var(--line-md)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} style={{ stroke: track }} />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fill" strokeWidth={stroke}
          style={{ stroke: color, strokeDasharray: c, strokeDashoffset: c * (1 - pct), filter: pct >= 1 ? 'drop-shadow(0 0 6px var(--gold-glow))' : 'none' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}

/* ── Cargador de munición ── */
function AmmoMagazine({ total, perDay, max = 24, tone = 'var(--gold)' }) {
  const days = perDay ? total / perDay : 0;
  const shown = Math.min(max, Math.max(0, Math.round(total / Math.max(1, perDay / 6)))); // ~6 balas por día
  const cap = Math.min(max, Math.round((max))); 
  const bullets = [];
  const filled = Math.min(cap, shown);
  for (let i = 0; i < cap; i++) bullets.push(i < filled);
  return <div className="mag" aria-label={`${Math.round(days)} días de cola`}>
    {bullets.map((on, i) => <span key={i} className={`bullet${on ? '' : ' spent'}`} style={on ? { background: tone } : null} />)}
  </div>;
}

/* ── Racha (fueguito que crece) ── */
function StreakFlame({ days }) {
  const scale = Math.min(1.7, 0.85 + days * 0.06);
  const color = days >= 14 ? 'var(--gold-bright)' : days >= 7 ? 'var(--hot)' : days >= 3 ? 'var(--warm)' : 'var(--text-3)';
  return (
    <span title={`Racha de ${days} días cumpliendo objetivo`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 15 * scale, lineHeight: 1, filter: days >= 3 ? 'none' : 'grayscale(.7)', transition: 'font-size .3s var(--ease)' }}>🔥</span>
      <b className="tnum" style={{ color, fontSize: 15, fontWeight: 750 }}>{days}</b>
    </span>
  );
}

/* ── Modal ── */
function Modal({ title, subtitle, onClose, children, footer, width }) {
  usE(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" style={width ? { width } : null} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px 15px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ flex: 1 }}>
            <h2 className="h-page" style={{ fontSize: 16.5 }}>{title}</h2>
            {subtitle && <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>{subtitle}</p>}
          </div>
          <IconButton name="x" title="Cerrar" onClick={onClose} />
        </div>
        <div className="scroll-y" style={{ padding: 20, flex: 1 }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, padding: '14px 20px', borderTop: '1px solid var(--line)' }}>{footer}</div>}
      </div>
    </div>
  );
}
function ConfirmModal({ title, body, children, confirmLabel = 'Confirmar', confirmIcon, variant = 'accent', onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} width={440}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant={variant} icon={confirmIcon} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
      </>}>
      {body && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{body}</p>}
      {children}
    </Modal>
  );
}

/* ── Drawer lateral ── */
function Drawer({ onClose, children, width }) {
  usE(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="drawer-wrap">
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer" style={width ? { width } : null} role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

/* ── Empty state con gracia ── */
function EmptyState({ emoji = '📭', title, hint, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '38px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 34, opacity: .9 }}>{emoji}</div>
      <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--text)' }}>{title}</div>
      {hint && <div style={{ fontSize: 12.5, maxWidth: 320, lineHeight: 1.55, color: 'var(--text-3)' }}>{hint}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

/* ── Card de sección con cabecera ── */
function SectionCard({ title, emoji, count, right, children, tone, style }) {
  return (
    <div className="card card-hair" style={{ padding: 0, overflow: 'hidden', ...style }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
          {emoji && <span style={{ fontSize: 15 }}>{emoji}</span>}
          <h3 className="h-sec" style={{ color: tone || 'var(--text)' }}>{title}</h3>
          {count != null && <span className="pill" style={{ background: 'var(--field-bg)', color: 'var(--text-3)', height: 20 }}>{count}</span>}
          <div style={{ marginLeft: 'auto' }}>{right}</div>
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Copiar al portapapeles ── */
function copyText(txt) {
  try {
    if (navigator.clipboard) { navigator.clipboard.writeText(txt); return true; }
  } catch (e) {}
  try {
    const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); return true;
  } catch (e) { return false; }
}

/* ── Toaster ── */
function Toaster({ toasts, dismiss }) {
  return (
    <div className="toaster" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span style={{ fontSize: 15 }}>{t.emoji || '✅'}</span>
          <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{t.msg}</span>
          {t.action && (
            <button className="toast-act" onClick={() => { t.action.fn(); dismiss(t.id); }}>{t.action.label}</button>
          )}
          <IconButton name="x" size={13} title="Cerrar" onClick={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}

/* ── KPI numérico serif ── */
function StatBig({ value, label, sub, color = 'var(--text)', format = fmtNum, animate = false, size = 34 }) {
  return (
    <div>
      <div className="serif tnum" style={{ fontSize: size, fontWeight: 600, lineHeight: 1, color, letterSpacing: '-.02em' }}>
        {animate ? <AnimatedNumber value={value} format={format} /> : format(value)}
      </div>
      <div className="meta" style={{ marginTop: 6, fontWeight: 550 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

Object.assign(window, {
  Button, IconButton, Field, Input, Textarea, Select, Segmented,
  Pill, TempBadge, VariantBadge, StarBadge, MaturityDot, StageBadge,
  AnimatedNumber, ProgressRing, AmmoMagazine, StreakFlame,
  Modal, ConfirmModal, Drawer, EmptyState, SectionCard, Toaster, StatBig, copyText,
});
