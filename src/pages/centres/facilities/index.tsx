import React from 'react';

import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

import { DEFAULT_AMENITIES } from '../constants';

import type { RootState } from '../../../store/store';

/** Icon + display label + icon tint per additional-facility type (mirrors the wizard). */
const FEATURE_META: Record<string, { icon: string; label: string; bg: string }> = {
  gym: { icon: '🏋️', label: 'Gym / Fitness Area', bg: '#fef9c3' },
  podcast: { icon: '🎙', label: 'Podcast Studio', bg: '#ecedf4' },
  meeting: { icon: '🗂', label: 'Meeting Rooms', bg: '#d0f0f0' },
  gaming: { icon: '🎮', label: 'Gaming Zone', bg: '#eeedfe' },
};

const LANE_META = [
  { key: 'batting', label: 'Batting Lanes', icon: '🏏', color: '#21295A' },
  { key: 'bowling', label: 'Bowling Lanes', icon: '🎳', color: '#008482' },
  { key: 'multipurpose', label: 'Hybrid Lanes', icon: '🔄', color: '#d97706' },
];

const to12h = (hhmm?: string): string => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!m) return hhmm ?? '';
  const ap = Number(m[1]) >= 12 ? 'PM' : 'AM';
  const h = Number(m[1]) % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
};

const money = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—';
};

type FeatureEntry = Record<string, unknown> & { name?: string };

/** True when a value is set (not null/undefined) — so a legit 0 still renders. */
const has = (v: unknown): boolean => v !== undefined && v !== null;

/** Build the label/value rows for one additional facility, skipping absent fields. */
const detailRows = (e: FeatureEntry): [string, string][] => {
  const rows: [string, string][] = [];
  if (has(e.fortnightlyPrice)) rows.push(['Fortnightly price', money(e.fortnightlyPrice)]);
  if (has(e.annualDiscountPct)) rows.push(['Annual discount', `${Number(e.annualDiscountPct)}%`]);
  if (has(e.totalCapacity)) rows.push(['Total capacity', `${Number(e.totalCapacity)} members`]);
  if (has(e.concurrentCapacity)) rows.push(['Max concurrent', `${Number(e.concurrentCapacity)} at a time`]);
  if (e.slotDuration) rows.push(['Slot duration', String(e.slotDuration)]);
  if (has(e.guestSessionPrice)) rows.push(['Guest price', money(e.guestSessionPrice)]);
  if (has(e.freeGuestVisits)) rows.push(['Free guest visits', `${Number(e.freeGuestVisits)} / month`]);
  if (has(e.psUnits)) rows.push(['PS units', String(e.psUnits)]);
  if (has(e.chargePerHour)) rows.push(['Charge / hour', money(e.chargePerHour)]);
  if (e.openTime && e.closeTime) {
    rows.push(['Operating hours', `${to12h(String(e.openTime))} – ${to12h(String(e.closeTime))}`]);
  }
  return rows;
};

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--sub)',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  marginBottom: 12,
};

/**
 * Centre → Facilities: primary lane counts, general amenities and additional
 * bookable spaces. Reads the loaded centre bundle (state.centres.details) that
 * CentreDetailView fetches for the open centre — no extra request.
 */
const Facilities: React.FC = () => {
  const bundle = useSelector((s: RootState) => s.centres.details);
  const lanes = bundle?.lanes ?? [];
  const laneCount = (type: string): number => lanes.filter(l => l.laneType === type).length;

  const features = (bundle?.facility?.features ?? {}) as Record<string, unknown>;
  const items: { type: string; entry: FeatureEntry }[] = [];
  Object.entries(features).forEach(([type, val]) => {
    if (Array.isArray(val)) val.forEach(v => v && typeof v === 'object' && items.push({ type, entry: v as FeatureEntry }));
    else if (val && typeof val === 'object') items.push({ type, entry: val as FeatureEntry });
  });

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>Facilities</div>
          <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>
            Primary lanes, general amenities and additional bookable spaces at this centre
          </div>
        </div>
        <button
          className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] border border-cmx-border bg-white px-3 py-1.5 text-[12.5px] font-semibold text-sub transition-all hover:bg-gray-50"
          type="button"
          onClick={() => toast('Edit facilities from Centre Management → Edit')}
        >
          <svg fill="none" height={13} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={13}>
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Facilities
        </button>
      </div>

      {/* Lanes */}
      <div style={sectionLabel}>Lanes</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {LANE_META.map(l => (
          <div
            key={l.key}
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${l.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {l.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>{laneCount(l.key)}</div>
              <div style={{ fontSize: 12, color: 'var(--sub)' }}>{l.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* General amenities */}
      <div style={sectionLabel}>General Amenities</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {DEFAULT_AMENITIES.map(a => (
          <span
            key={a}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#e6f4f4',
              border: '1px solid #99d9d8',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              color: '#006e6c',
            }}
          >
            ✅ {a}
          </span>
        ))}
      </div>

      {/* Additional bookable facilities */}
      <div style={sectionLabel}>Additional Bookable Facilities</div>
      {items.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 32,
            textAlign: 'center',
            color: 'var(--sub)',
            fontSize: 12.5,
          }}
        >
          No additional facilities configured for this centre yet.
          <div style={{ fontSize: 11, marginTop: 4 }}>Add them from the New Centre wizard or the Facilities editor.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {items.map(({ type, entry }, i) => {
            const meta = FEATURE_META[type] ?? { icon: '📦', label: type, bg: '#f3f4f6' };
            const rows = detailRows(entry);
            return (
              <div
                key={`${type}-${i}`}
                style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: meta.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
                      {entry.name || meta.label}
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: 3,
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: '#d97706',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: 20,
                        padding: '1px 8px',
                      }}
                    >
                      Active
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', padding: 16 }}>
                  {rows.map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: 'var(--sub)' }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginTop: 2 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Facilities;
