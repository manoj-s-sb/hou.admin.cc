import React from 'react';

import { toast } from 'react-hot-toast';

import { DEFAULT_AMENITIES } from '../constants';

import type { CentreWithKPI } from '../../../store/centres/types';

const comingSoon = () => toast('Coming soon');

interface Props {
  centre: CentreWithKPI;
}

/** Ops → Facilities: lanes, general amenities, and additional bookable spaces. */
const FacilitiesTab: React.FC<Props> = ({ centre }) => {
  const lanes = [
    { label: 'Batting Lanes', count: centre.battingLanes, icon: '🏏', color: '#21295A' },
    { label: 'Bowling Lanes', count: centre.bowlingLanes, icon: '🎳', color: '#008482' },
    { label: 'Hybrid Lanes', count: centre.multipurposeLanes, icon: '🔄', color: '#d97706' },
  ];

  const amenities = centre.facilities?.length ? centre.facilities : DEFAULT_AMENITIES;

  const sectionLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--sub)',
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    marginBottom: 12,
  };

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
          onClick={comingSoon}
        >
          <svg fill="none" height={13} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={13}>
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Facilities
        </button>
      </div>

      <div style={sectionLabel}>Lanes</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {lanes.map(l => (
          <div
            key={l.label}
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
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>{l.count}</div>
              <div style={{ fontSize: 12, color: 'var(--sub)' }}>{l.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={sectionLabel}>General Amenities</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {amenities.map(a => (
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

      <div style={sectionLabel}>Additional Bookable Facilities</div>
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
    </div>
  );
};

export default FacilitiesTab;
