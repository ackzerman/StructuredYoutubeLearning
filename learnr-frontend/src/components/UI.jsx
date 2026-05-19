import { useState } from 'react';
import { pct } from '../utils';

/* ─── Spinner ──────────────────────────────────────────────────────────────── */
export function Spinner({ size = 32, pad = 60 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: pad }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: '3px solid #252a3d', borderTopColor: '#f0a030',
        animation: 'spin 0.75s linear infinite',
      }} />
    </div>
  );
}

/* ─── ErrBox ───────────────────────────────────────────────────────────────── */
export function ErrBox({ msg }) {
  if (!msg) return null;
  return <div className="err-box">⚠ {msg}</div>;
}

/* ─── Progress bar ─────────────────────────────────────────────────────────── */
export function ProgressBar({ value, color = '#f0a030', height = 4 }) {
  return (
    <div className="progress-bar" style={{ height }}>
      <div className="progress-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

/* ─── Heatmap ──────────────────────────────────────────────────────────────── */
const heatColor = (c) => {
  if (c === 0) return '#252a3d';
  if (c === 1) return '#6b4010';
  if (c <= 3)  return '#a86020';
  if (c <= 6)  return '#d08030';
  return '#f0a030';
};

export function Heatmap({ data = [], weeks = 13 }) {
  const map = {};
  data.forEach((d) => { map[d.date] = d.count ?? d.videosWatched ?? 0; });

  const days = [];
  const today = new Date();
  const total = weeks * 7;
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const k = d.toISOString().slice(0, 10);
    days.push({ date: k, count: map[k] || 0 });
  }

  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const wdays = days.slice(w * 7, w * 7 + 7);
    cols.push(
      <div key={w} className="heatmap-col">
        {wdays.map((d) => (
          <div
            key={d.date}
            className="heatmap-day"
            title={`${d.date}: ${d.count} video${d.count !== 1 ? 's' : ''}`}
            style={{ background: heatColor(d.count) }}
          />
        ))}
      </div>
    );
  }
  return <div className="heatmap-grid">{cols}</div>;
}

export function HeatmapLegend() {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: '#454e6a' }}>Less</span>
      {[0, 1, 3, 5, 7].map((c) => (
        <div key={c} className="heatmap-day" style={{ background: heatColor(c) }} />
      ))}
      <span style={{ fontSize: 11, color: '#454e6a' }}>More</span>
    </div>
  );
}

/* ─── StatCard ─────────────────────────────────────────────────────────────── */
export function StatCard({ label, value, color = '#f0a030', sub }) {
  return (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <p style={{ fontSize: 11, color: '#828aaa', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0, letterSpacing: '-0.02em' }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: '#454e6a', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}

/* ─── Modal ────────────────────────────────────────────────────────────────── */
export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-box${wide ? ' wide' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#dee2f0' }}>{title}</h2>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 18, border: 'none' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── LabelInput ───────────────────────────────────────────────────────────── */
export function LabelInput({ label, textarea = false, hint, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="label">{label}</label>
      {textarea
        ? <textarea className="input" {...props} />
        : <input className="input" {...props} />
      }
      {hint && <p style={{ fontSize: 12, color: '#454e6a', margin: 0 }}>{hint}</p>}
    </div>
  );
}

/* ─── CourseSourceBadge ────────────────────────────────────────────────────── */
export function CourseBadge({ source }) {
  return source === 'youtube'
    ? <span className="badge-yt">▶ YouTube</span>
    : <span className="badge-manual">✏ Manual</span>;
}

/* ─── VideoProgress circle ─────────────────────────────────────────────────── */
export function VideoCircle({ index, completed, active }) {
  const bg = completed ? '#4ade80' : active ? '#f0a030' : '#252a3d';
  const color = (completed || active) ? '#000' : '#454e6a';
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: bg, color, fontSize: completed ? 13 : 12, fontWeight: 700,
    }}>
      {completed ? '✓' : index + 1}
    </div>
  );
}

/* ─── Empty state ──────────────────────────────────────────────────────────── */
export function EmptyState({ icon, title, sub, action, onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 20px' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ color: '#dee2f0', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      {sub && <p style={{ color: '#828aaa', fontSize: 14, marginBottom: 20 }}>{sub}</p>}
      {action && <button className="btn-primary" onClick={onAction}>{action}</button>}
    </div>
  );
}

/* ─── Section header row ───────────────────────────────────────────────────── */
export function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <h3 className="section-header">{title}</h3>
      {action && (
        <span onClick={onAction} style={{ color: '#f0a030', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
          {action}
        </span>
      )}
    </div>
  );
}

/* ─── Tag Editor — inline add/remove tags ──────────────────────────────── */
export function TagEditor({ tags = [], onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue]   = useState('');

  const addTag = () => {
    const t = value.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      onUpdate([...tags, t]);
    }
    setValue('');
    setAdding(false);
  };

  const removeTag = (tag) => {
    onUpdate(tags.filter((t) => t !== tag));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    if (e.key === 'Escape') { setValue(''); setAdding(false); }
  };

  return (
    <div className="tag-editor">
      {tags.map((t) => (
        <span key={t} className="tag-editable">
          {t}
          <button className="tag-remove" onClick={() => removeTag(t)} title={`Remove "${t}"`}>×</button>
        </span>
      ))}
      {adding ? (
        <input
          className="tag-add-input"
          autoFocus
          placeholder="tag name…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={addTag}
        />
      ) : (
        <button className="tag-add-btn" onClick={() => setAdding(true)}>+ tag</button>
      )}
    </div>
  );
}

/* ─── Tag Filter Bar — clickable filter chips ──────────────────────────── */
export function TagFilterBar({ allTags, activeTags, onToggle }) {
  if (!allTags || allTags.length === 0) return null;
  return (
    <div className="tag-filter-bar">
      <span style={{ fontSize: 12, color: '#454e6a', fontWeight: 600, marginRight: 4 }}>Filter:</span>
      {allTags.map((t) => (
        <button
          key={t}
          className={`tag-chip${activeTags.includes(t) ? ' active' : ''}`}
          onClick={() => onToggle(t)}
        >
          {t}
          {activeTags.includes(t) && <span style={{ fontSize: 10 }}>✕</span>}
        </button>
      ))}
      {activeTags.length > 0 && (
        <button
          className="tag-chip"
          style={{ fontSize: 11, color: '#828aaa' }}
          onClick={() => activeTags.forEach(onToggle)}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
