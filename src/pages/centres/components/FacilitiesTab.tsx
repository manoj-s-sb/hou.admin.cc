import React from 'react';

import type { CentreWithKPI } from '../types';

interface Props {
  centre: CentreWithKPI;
}

const DEFAULT_AMENITIES = [
  'Changing Rooms',
  'Parking',
  'Café / Canteen',
  'Lounge / Viewing',
  'Pro Shop',
  'Coaching Area',
];

/** Ops → Facilities: lanes, general amenities, and additional bookable spaces. */
const FacilitiesTab: React.FC<Props> = ({ centre }) => {
  const lanes = [
    { label: 'Batting Lanes', count: centre.battingLanes, icon: '🏏', color: '#21295A' },
    { label: 'Bowling Lanes', count: centre.bowlingLanes, icon: '🎳', color: '#008482' },
    { label: 'Hybrid Lanes', count: centre.multipurposeLanes, icon: '🔄', color: '#d97706' },
  ];

  const amenities = centre.facilities?.length ? centre.facilities : DEFAULT_AMENITIES;

  const additional = [
    {
      icon: '🏋️',
      label: 'Gym / Fitness Area',
      color: '#d97706',
      bg: '#fef9c3',
      fields: [
        ['Fortnightly price', '$29.95'],
        ['Annual discount', '15%'],
        ['Total capacity', '200 members'],
        ['Max concurrent', '30 users at a time'],
        ['Slot duration', '60 minutes'],
        ['Guest price', '$20.00'],
        ['Free guest visits', '2 / month'],
        ['Operating hours', '5:00 AM – 10:00 PM'],
      ] as [string, string][],
    },
    {
      icon: '🗂',
      label: 'Meeting Rooms',
      color: '#008482',
      bg: '#d0f0f0',
      fields: [
        ['Rooms configured', '2 rooms'],
        ['Seating capacity', 'Up to 12 per room'],
        ['Price per slot', '$40.00'],
        ['Slot duration', '60 minutes'],
        ['Operating hours', '8:00 AM – 8:00 PM'],
        ['Booking', 'Real-time via app'],
      ] as [string, string][],
    },
  ];

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
        <button className="cmx-btn cmx-btn-outline" type="button">
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {additional.map(f => (
          <div
            key={f.label}
            style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: f.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{f.label}</div>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 2,
                      fontSize: 10,
                      fontWeight: 600,
                      background: `${f.color}18`,
                      color: f.color,
                      borderRadius: 10,
                      padding: '1px 8px',
                    }}
                  >
                    Active
                  </span>
                </div>
              </div>
              <button className="cmx-btn cmx-btn-outline" style={{ fontSize: 11, padding: '3px 9px' }} type="button">
                Edit
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {f.fields.map(([k, v], i) => (
                <div
                  key={k}
                  style={{
                    padding: '10px 14px',
                    borderRight: i % 2 === 0 ? '1px solid var(--border)' : undefined,
                    borderBottom: i < f.fields.length - 2 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <div style={{ fontSize: 10.5, color: 'var(--sub)', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FacilitiesTab;
