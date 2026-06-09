import React from 'react';

import type { AdditionalFacility, AdditionalFacilityType } from '../types';

const PANELS: {
  type: AdditionalFacilityType;
  icon: string;
  iconBg: string;
  title: string;
  desc: string;
  multi: boolean;
}[] = [
  {
    type: 'gym',
    icon: '🏋️',
    iconBg: '#fef9c3',
    title: 'Gym / Fitness area',
    desc: 'Bookable fitness space — capacity, pricing & guest access',
    multi: false,
  },
  {
    type: 'podcast',
    icon: '🎙',
    iconBg: '#ecedf4',
    title: 'Podcast rooms',
    desc: 'Recording spaces — add one or more rooms with individual configs',
    multi: true,
  },
  {
    type: 'meeting',
    icon: '🗂',
    iconBg: '#d0f0f0',
    title: 'Meeting rooms',
    desc: 'Conference spaces — add one or more rooms with individual configs',
    multi: true,
  },
  {
    type: 'gaming',
    icon: '🎮',
    iconBg: '#eeedfe',
    title: 'Gaming area',
    desc: 'PlayStation consoles — instant availability via app',
    multi: false,
  },
];

const SLOT_OPTIONS = [
  '30 minutes',
  '45 minutes',
  '60 minutes',
  '90 minutes',
  '120 minutes',
  'No fixed slots (open access)',
];

let seq = 0;
const uid = (type: string) => {
  seq += 1;
  return `${type}-${seq}-${Math.random().toString(36).slice(2, 7)}`;
};

export const makeAdditionalFacility = (type: AdditionalFacilityType, index = 1): AdditionalFacility => ({
  id: uid(type),
  type,
  enabled: true,
  name:
    type === 'gym'
      ? 'Gym / Fitness Area'
      : type === 'gaming'
        ? 'Gaming Area'
        : `${type === 'podcast' ? 'Podcast' : 'Meeting'} Room ${index}`,
  fortnightlyPrice: 0,
  annualDiscountPct: 0,
  totalCapacity: type === 'gym' ? 200 : 12,
  concurrentCapacity: type === 'gym' ? 30 : 1,
  seatingCapacity: type === 'meeting' ? 12 : type === 'podcast' ? 4 : undefined,
  slotDuration: '60 minutes',
  guestSessionPrice: 0,
  freeGuestVisits: 0,
  openTime: type === 'gaming' ? '10:00' : type === 'gym' ? '05:00' : '08:00',
  closeTime: type === 'gaming' ? '22:00' : type === 'gym' ? '22:00' : '20:00',
  psUnits: type === 'gaming' ? 4 : undefined,
  chargePerHour: type === 'gaming' ? 0 : undefined,
  minSession: type === 'gaming' ? '60 minutes' : undefined,
  maxSession: type === 'gaming' ? '120 minutes' : undefined,
});

interface Props {
  facilities: AdditionalFacility[];
  onChange: (next: AdditionalFacility[]) => void;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--sub)',
      textTransform: 'uppercase',
      letterSpacing: '.05em',
      margin: '14px 0 10px',
    }}
  >
    {children}
  </div>
);

const PhotoUpload: React.FC = () => (
  <label className="cmx-ff">
    <span className="cmx-fld-lbl">Photo</span>
    <div
      style={{
        border: '1.5px dashed var(--border)',
        borderRadius: 8,
        height: 64,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        background: '#fff',
        cursor: 'pointer',
      }}
    >
      <svg fill="none" height={16} stroke="var(--muted)" strokeWidth={2} viewBox="0 0 24 24" width={16}>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
      </svg>
      <span style={{ fontSize: 11, color: 'var(--sub)' }}>Upload image (JPG, PNG · max 5MB)</span>
      <input accept="image/png,image/jpeg" style={{ display: 'none' }} type="file" />
    </div>
  </label>
);

const AdditionalFacilitiesStep: React.FC<Props> = ({ facilities, onChange }) => {
  const patch = (id: string, p: Partial<AdditionalFacility>) =>
    onChange(facilities.map(f => (f.id === id ? { ...f, ...p } : f)));

  const toggleType = (type: AdditionalFacilityType, multi: boolean, on: boolean) => {
    if (on) {
      if (facilities.some(f => f.type === type)) return;
      onChange([...facilities, makeAdditionalFacility(type)]);
    } else {
      onChange(facilities.filter(f => f.type !== type));
    }
  };

  const addRoom = (type: AdditionalFacilityType) => {
    const count = facilities.filter(f => f.type === type).length + 1;
    onChange([...facilities, makeAdditionalFacility(type, count)]);
  };

  const removeRoom = (id: string) => onChange(facilities.filter(f => f.id !== id));

  // ── per-facility config form ──
  const renderConfig = (f: AdditionalFacility, roomLabel?: string) => {
    if (f.type === 'gaming') {
      return (
        <>
          <SectionLabel>PlayStation setup</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label className="cmx-ff">
              <span className="cmx-fld-lbl">Number of PS units</span>
              <input
                min={1}
                type="number"
                value={f.psUnits ?? 0}
                onChange={e => patch(f.id, { psUnits: Number(e.target.value) })}
              />
            </label>
            <label className="cmx-ff">
              <span className="cmx-fld-lbl">Charge per hour ($)</span>
              <input
                min={0}
                step={0.01}
                type="number"
                value={f.chargePerHour ?? 0}
                onChange={e => patch(f.id, { chargePerHour: Number(e.target.value) })}
              />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label className="cmx-ff">
              <span className="cmx-fld-lbl">Min session</span>
              <select value={f.minSession} onChange={e => patch(f.id, { minSession: e.target.value })}>
                {['30 minutes', '60 minutes', '90 minutes'].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
            <label className="cmx-ff">
              <span className="cmx-fld-lbl">Max session</span>
              <select value={f.maxSession} onChange={e => patch(f.id, { maxSession: e.target.value })}>
                {['60 minutes', '120 minutes', '180 minutes', 'No limit'].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          </div>
          <OperatingHours f={f} patch={patch} />
          <PhotoUpload />
        </>
      );
    }

    // gym / podcast / meeting
    return (
      <>
        {roomLabel && (
          <label className="cmx-ff" style={{ marginBottom: 12 }}>
            <span className="cmx-fld-lbl">Room name</span>
            <input type="text" value={f.name} onChange={e => patch(f.id, { name: e.target.value })} />
          </label>
        )}
        <SectionLabel>Pricing</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label className="cmx-ff">
            <span className="cmx-fld-lbl">Fortnightly price ($)</span>
            <input
              min={0}
              placeholder="e.g. 29.95"
              step={0.01}
              type="number"
              value={f.fortnightlyPrice}
              onChange={e => patch(f.id, { fortnightlyPrice: Number(e.target.value) })}
            />
          </label>
          <label className="cmx-ff">
            <span className="cmx-fld-lbl">Annual discount (%)</span>
            <input
              max={100}
              min={0}
              placeholder="e.g. 15"
              type="number"
              value={f.annualDiscountPct}
              onChange={e => patch(f.id, { annualDiscountPct: Number(e.target.value) })}
            />
          </label>
        </div>

        <SectionLabel>Capacity &amp; Access</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label className="cmx-ff">
            <span className="cmx-fld-lbl">{f.type === 'gym' ? 'Total capacity (members)' : 'Seating capacity'}</span>
            <input
              min={1}
              type="number"
              value={f.type === 'gym' ? f.totalCapacity : (f.seatingCapacity ?? 0)}
              onChange={e =>
                patch(
                  f.id,
                  f.type === 'gym'
                    ? { totalCapacity: Number(e.target.value) }
                    : { seatingCapacity: Number(e.target.value) }
                )
              }
            />
          </label>
          <label className="cmx-ff">
            <span className="cmx-fld-lbl">Max concurrent users</span>
            <input
              min={1}
              type="number"
              value={f.concurrentCapacity}
              onChange={e => patch(f.id, { concurrentCapacity: Number(e.target.value) })}
            />
          </label>
          <label className="cmx-ff">
            <span className="cmx-fld-lbl">Slot duration</span>
            <select value={f.slotDuration} onChange={e => patch(f.id, { slotDuration: e.target.value })}>
              {SLOT_OPTIONS.map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        </div>

        <SectionLabel>Guest Access</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label className="cmx-ff">
            <span className="cmx-fld-lbl">Guest session price ($)</span>
            <input
              min={0}
              step={0.01}
              type="number"
              value={f.guestSessionPrice}
              onChange={e => patch(f.id, { guestSessionPrice: Number(e.target.value) })}
            />
          </label>
          <label className="cmx-ff">
            <span className="cmx-fld-lbl">Free guest visits / month</span>
            <input
              min={0}
              type="number"
              value={f.freeGuestVisits}
              onChange={e => patch(f.id, { freeGuestVisits: Number(e.target.value) })}
            />
          </label>
        </div>

        <SectionLabel>Operating Hours</SectionLabel>
        <OperatingHours f={f} patch={patch} />
        <PhotoUpload />
      </>
    );
  };

  return (
    <div>
      <div className="cmx-note" style={{ marginBottom: 16 }}>
        Enable additional spaces members can book via the app. Each facility shows real-time availability. These are
        optional — you can also configure them after the centre is created.
      </div>

      {PANELS.map(panel => {
        const instances = facilities.filter(f => f.type === panel.type);
        const enabled = instances.length > 0;
        return (
          <div
            key={panel.type}
            style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 16px',
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: panel.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {panel.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{panel.title}</span>
                    {panel.multi && enabled && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          background: 'var(--blue-light)',
                          color: 'var(--blue)',
                          borderRadius: 10,
                          padding: '1px 7px',
                        }}
                      >
                        {instances.length} room{instances.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 1 }}>{panel.desc}</div>
                </div>
              </div>
              <label className="cmx-toggle">
                <input
                  aria-label={`Enable ${panel.title}`}
                  checked={enabled}
                  type="checkbox"
                  onChange={e => toggleType(panel.type, panel.multi, e.target.checked)}
                />
                <span className="track">
                  <span className="knob" />
                </span>
              </label>
            </div>

            {enabled && (
              <div style={{ borderTop: '1px solid var(--border)', background: '#f9fafb' }}>
                {panel.multi ? (
                  <>
                    {instances.map((f, i) => (
                      <div
                        key={f.id}
                        style={{
                          padding: 16,
                          borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
                            {panel.title.replace(/s$/, '')} {i + 1}
                          </div>
                          {instances.length > 1 && (
                            <button
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--muted)',
                                fontSize: 16,
                              }}
                              type="button"
                              onClick={() => removeRoom(f.id)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                        {renderConfig(f, panel.title)}
                      </div>
                    ))}
                    <div style={{ padding: '10px 16px' }}>
                      <button
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          border: '1.5px dashed var(--border)',
                          borderRadius: 8,
                          background: '#fff',
                          color: 'var(--blue)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          width: '100%',
                          justifyContent: 'center',
                        }}
                        type="button"
                        onClick={() => addRoom(panel.type)}
                      >
                        + Add another {panel.title.replace(/s$/, '').toLowerCase()}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 16 }}>{renderConfig(instances[0])}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const OperatingHours: React.FC<{
  f: AdditionalFacility;
  patch: (id: string, p: Partial<AdditionalFacility>) => void;
}> = ({ f, patch }) => (
  <label className="cmx-ff" style={{ marginBottom: 12 }}>
    <span className="cmx-fld-lbl">Operating hours</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        style={{ width: 130 }}
        type="time"
        value={f.openTime}
        onChange={e => patch(f.id, { openTime: e.target.value })}
      />
      <span style={{ fontSize: 12, color: 'var(--sub)' }}>to</span>
      <input
        style={{ width: 130 }}
        type="time"
        value={f.closeTime}
        onChange={e => patch(f.id, { closeTime: e.target.value })}
      />
    </div>
  </label>
);

export default AdditionalFacilitiesStep;
