import { useEffect, useRef, useState } from 'react';

import { COUNTRIES, COUNTRY_DIAL_CODES } from '../pages/centres/constants';

/**
 * Searchable phone dial-code picker — shared between the New Centre wizard
 * and Staff Management's profile step, which both used to have their own
 * plain native <select> listing 240+ "+XX CC" options. That overflows the
 * viewport and only supports jumping to the first matching letter, not a
 * real search. Typing "india", "in", or "91" (with or without the leading +)
 * all find India here.
 *
 * `className`/`style` style the text input itself so each call site can keep
 * its own existing field look (Tailwind classes in one place, inline styles
 * in another) — this component only owns the search/dropdown behavior.
 */
const PHONE_CODE_OPTIONS = COUNTRIES.map(c => ({
  isoCode: c.code,
  label: c.label,
  dialCode: COUNTRY_DIAL_CODES[c.code] || '',
})).filter(o => o.dialCode);

interface PhoneCodeSearchSelectProps {
  value: string;
  onChange: (dialCode: string) => void;
  className?: string;
  style?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  /**
   * This app's country `code` (e.g. "US") for the address/centre country
   * already chosen elsewhere on the same form, when there is one. Several
   * real countries genuinely share one dial code (the US and Canada both use
   * "+1"; Russia and Kazakhstan both use "+7"), so matching by dial code
   * alone is ambiguous — without this hint the label shown next to the code
   * is just whichever same-code country sorts first alphabetically (e.g.
   * "+1 AS" for American Samoa when the admin actually picked the US).
   * Pass it whenever the caller has a country to match against; omit it for
   * a standalone phone field with no linked country (e.g. Staff Management).
   */
  preferredIso?: string;
}

const PhoneCodeSearchSelect: React.FC<PhoneCodeSearchSelectProps> = ({
  value,
  onChange,
  className,
  style,
  wrapperStyle,
  preferredIso,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const selected =
    (preferredIso && PHONE_CODE_OPTIONS.find(o => o.dialCode === value && o.isoCode === preferredIso)) ||
    PHONE_CODE_OPTIONS.find(o => o.dialCode === value);
  const q = query.trim().toLowerCase().replace(/^\+/, '');
  const filtered = PHONE_CODE_OPTIONS.filter(
    o =>
      o.label.toLowerCase().includes(q) ||
      o.isoCode.toLowerCase().includes(q) ||
      o.dialCode.replace('+', '').includes(q)
  );

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: '0 0 120px', ...wrapperStyle }}>
      <input
        aria-label="Country code"
        autoComplete="off"
        className={className}
        placeholder="Code"
        style={{ paddingLeft: 8, paddingRight: 4, ...style }}
        type="text"
        value={open ? query : selected ? `${selected.dialCode} ${selected.isoCode}` : ''}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: 220,
            zIndex: 20,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 8,
            maxHeight: 240,
            overflowY: 'auto',
            boxShadow: '0 8px 20px rgba(0,0,0,.1)',
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--sub)' }}>No matching country</div>
          )}
          {filtered.map(o => (
            <button
              key={o.isoCode}
              style={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                gap: 10,
                textAlign: 'left',
                padding: '9px 12px',
                background: o.dialCode === value ? 'rgba(37,99,235,0.06)' : '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--navy)',
              }}
              type="button"
              onClick={() => {
                onChange(o.dialCode);
                setOpen(false);
                setQuery('');
              }}
            >
              <span>{o.label}</span>
              <span style={{ color: 'var(--sub)', fontWeight: 600 }}>
                {o.dialCode} {o.isoCode}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhoneCodeSearchSelect;
