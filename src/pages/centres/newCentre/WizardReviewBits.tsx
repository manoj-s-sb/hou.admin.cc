import React, { useState } from 'react';

/**
 * Small presentational pieces for the wizard's Review step, extracted from
 * NewCentreWizard. Pure — driven entirely by props.
 */

export const StatusOption: React.FC<{ checked: boolean; title: string; desc: string; onSelect: () => void }> = ({
  checked,
  title,
  desc,
  onSelect,
}) => (
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  <div
    style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      border: `1px solid ${checked ? 'var(--blue)' : 'var(--border)'}`,
      borderRadius: 10,
      padding: '16px 18px',
      cursor: 'pointer',
      background: checked ? 'rgba(37,99,235,0.04)' : '#fff',
      transition: 'border-color .15s, background .15s',
    }}
    onClick={onSelect}
  >
    <span
      style={{
        flexShrink: 0,
        marginTop: 2,
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: `2px solid ${checked ? 'var(--blue)' : 'var(--muted)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--blue)' }} />}
    </span>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--sub)', marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
    </div>
  </div>
);

export const ReviewCard: React.FC<{ title: string; onEdit: () => void; children: React.ReactNode }> = ({
  title,
  onEdit,
  children,
}) => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
      <div
        style={{
          background: 'var(--navy)',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          type="button"
          onClick={() => setOpen(o => !o)}
        >
          <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
          {title}
        </button>
        <button
          style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
          type="button"
          onClick={onEdit}
        >
          Edit
        </button>
      </div>
      {open && <div style={{ padding: '14px 16px', fontSize: 12.5 }}>{children}</div>}
    </div>
  );
};

export const ReviewGrid: React.FC<{ rows: [string, string][] }> = ({ rows }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
    {rows.map(([k, v]) => (
      <div key={k}>
        <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {k}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--navy)', fontWeight: 500 }}>{v}</div>
      </div>
    ))}
  </div>
);
