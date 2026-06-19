import React from 'react';

/**
 * Generic, recursive renderer for arbitrary backend objects.
 *
 * The centre `/details` bundle carries rich, loosely-typed config blobs
 * (security, features, waitlist, edgeDevice, membership access/bookingRules,
 * salesFlow phases, …). Rather than hand-curate every key, this walks whatever
 * the API returns and renders it as readable label/value pairs so "all fields
 * for the centre" are shown without the frontend needing to know each shape.
 */

const HIDDEN_KEYS = new Set(['type', 'id', '_raw', '_id']);

/** camelCase / snake_case / kebab-case → "Title Case". */
const humanize = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());

const isEmpty = (v: unknown): boolean =>
  v === null ||
  v === undefined ||
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

const isPrimitive = (v: unknown): v is string | number | boolean =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

const fmtPrimitive = (v: string | number | boolean): string => {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  color: 'var(--sub)',
};

const GRID: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 };

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
    <span style={labelStyle}>{label}</span>
    <span style={{ fontSize: 13, color: 'var(--text)', wordBreak: 'break-word' }}>{value}</span>
  </div>
);

/** A nested object/array sub-block with a heading. */
const SubBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 2 }}>
    <div style={{ ...labelStyle, color: 'var(--navy)', marginBottom: 8 }}>{title}</div>
    {children}
  </div>
);

interface Props {
  data: Record<string, unknown>;
  /** Keys already rendered elsewhere (e.g. the curated cards) — skip them. */
  omit?: string[];
}

const AutoFields: React.FC<Props> = ({ data, omit = [] }) => {
  const skip = new Set([...HIDDEN_KEYS, ...omit]);
  const entries = Object.entries(data).filter(([k, v]) => !skip.has(k) && !isEmpty(v));

  if (entries.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--sub)' }}>No additional configuration.</div>;
  }

  return (
    <div style={GRID}>
      {entries.map(([key, value]) => {
        const label = humanize(key);

        if (isPrimitive(value)) {
          return <Field key={key} label={label} value={fmtPrimitive(value)} />;
        }

        if (Array.isArray(value)) {
          // Array of primitives → comma-joined; array of objects → stacked sub-blocks.
          if (value.every(isPrimitive)) {
            return <Field key={key} label={label} value={(value as (string | number | boolean)[]).map(fmtPrimitive).join(', ')} />;
          }
          return (
            <SubBlock key={key} title={label}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {value.map((item, i) => (
                  <div
                    key={i}
                    style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#fafbfc' }}
                  >
                    {item && typeof item === 'object' ? (
                      <AutoFields data={item as Record<string, unknown>} />
                    ) : (
                      <span style={{ fontSize: 13 }}>{String(item)}</span>
                    )}
                  </div>
                ))}
              </div>
            </SubBlock>
          );
        }

        // Nested object → recurse inside a sub-block.
        return (
          <SubBlock key={key} title={label}>
            <AutoFields data={value as Record<string, unknown>} />
          </SubBlock>
        );
      })}
    </div>
  );
};

export default AutoFields;
