import React from 'react';

import NumberInput from '../../../components/NumberInput';

import type { AdditionalFacility, AdditionalFacilityType, FacilityPhoto } from '../../../store/centres/types';

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

const FF_INPUT =
  'w-full rounded-[7px] border border-cmx-border bg-white px-2.5 py-2 text-[13px] text-cmx-text outline-none focus:border-cmx-blue focus:shadow-[0_0_0_2px_rgba(37,99,235,0.1)] disabled:bg-gray-50 disabled:text-muted';

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

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const PhotoUpload: React.FC<{ photos?: FacilityPhoto[]; onChange: (photos: FacilityPhoto[]) => void }> = ({
  photos = [],
  onChange,
}) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);

  // Revoke every object URL still held when this facility card unmounts.
  React.useEffect(() => {
    const urls = photos.map(p => p.previewUrl);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickFiles = (files: File[]) => {
    const oversized = files.find(f => f.size > MAX_PHOTO_BYTES);
    if (oversized) {
      window.alert('Image too large — must be 5 MB or less.');
      return;
    }
    onChange([...photos, ...files.map(f => ({ name: f.name, previewUrl: URL.createObjectURL(f) }))]);
  };

  const removeAt = (index: number) => {
    URL.revokeObjectURL(photos[index].previewUrl);
    onChange(photos.filter((_, i) => i !== index));
  };

  const inputEl = (
    <input
      ref={inputRef}
      multiple
      accept="image/png,image/jpeg"
      style={{ display: 'none' }}
      type="file"
      onChange={e => {
        const files = Array.from(e.target.files ?? []);
        // Reset immediately so re-picking the same file (e.g. after Remove) still fires onChange.
        e.target.value = '';
        if (files.length) pickFiles(files);
      }}
    />
  );

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Photo</span>
      <div
        style={{
          border: '1.5px dashed var(--border)',
          borderRadius: 8,
          minHeight: 64,
          padding: '8px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: photos.length ? 'flex-start' : 'center',
          gap: 12,
          background: '#fff',
        }}
      >
        {photos.length === 0 && (
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <svg fill="none" height={16} stroke="var(--muted)" strokeWidth={2} viewBox="0 0 24 24" width={16}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <span style={{ fontSize: 11, color: 'var(--sub)' }}>Upload image (JPG, PNG · max 5MB)</span>
            {inputEl}
          </label>
        )}
        {photos.map((p, i) => (
          <div
            key={p.previewUrl}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 84 }}
          >
            <button
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'zoom-in' }}
              title="Click to preview"
              type="button"
              onClick={() => setLightboxUrl(p.previewUrl)}
            >
              <img alt="Preview" src={p.previewUrl} style={{ height: 40, borderRadius: 4, objectFit: 'cover' }} />
            </button>
            <span
              style={{
                fontSize: 11,
                color: 'var(--sub)',
                maxWidth: 84,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {p.name}
            </span>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 11, cursor: 'pointer' }}
              type="button"
              onClick={() => removeAt(i)}
            >
              Remove
            </button>
          </div>
        ))}
        {photos.length > 0 && (
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              width: 84,
              height: 64,
              border: '1.5px dashed var(--border)',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--blue)',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            + Add
            {inputEl}
          </label>
        )}
      </div>
      {lightboxUrl && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            padding: 24,
            cursor: 'zoom-out',
          }}
          onClick={() => setLightboxUrl(null)}
        >
          <img
            alt="Preview"
            src={lightboxUrl}
            style={{ maxHeight: '100%', maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
};

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
      const minMins = Number(/^\d+/.exec(f.minSession ?? '')?.[0] ?? 0);
      const maxMins = f.maxSession === 'No limit' ? Infinity : Number(/^\d+/.exec(f.maxSession ?? '')?.[0] ?? 0);
      const sessionInvalid = minMins > 0 && maxMins > 0 && minMins > maxMins;
      return (
        <>
          <SectionLabel>PlayStation setup</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Number of PS units</span>
              <NumberInput
                className={FF_INPUT}
                min={1}
                value={f.psUnits ?? 0}
                onValueChange={v => patch(f.id, { psUnits: v })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
                Charge per hour ($)
              </span>
              <NumberInput
                className={FF_INPUT}
                min={0}
                step={0.01}
                value={f.chargePerHour ?? 0}
                onValueChange={v => patch(f.id, { chargePerHour: v })}
              />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Min session</span>
              <select
                className={FF_INPUT}
                value={f.minSession}
                onChange={e => patch(f.id, { minSession: e.target.value })}
              >
                {['30 minutes', '60 minutes', '90 minutes'].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Max session</span>
              <select
                className={FF_INPUT}
                value={f.maxSession}
                onChange={e => patch(f.id, { maxSession: e.target.value })}
              >
                {['60 minutes', '120 minutes', '180 minutes', 'No limit'].map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          </div>
          {sessionInvalid && (
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: -6, marginBottom: 12 }}>
              Min session must be ≤ Max session.
            </div>
          )}
          <OperatingHours f={f} patch={patch} />
          <PhotoUpload photos={f.photos} onChange={photos => patch(f.id, { photos })} />
        </>
      );
    }

    // gym / podcast / meeting
    return (
      <>
        {roomLabel && (
          <label className="flex flex-col gap-1" style={{ marginBottom: 12 }}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Room name</span>
            <input
              className={FF_INPUT}
              type="text"
              value={f.name}
              onChange={e => patch(f.id, { name: e.target.value })}
            />
          </label>
        )}
        <SectionLabel>Pricing</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
              Fortnightly price ($)
            </span>
            <NumberInput
              className={FF_INPUT}
              min={0}
              placeholder="e.g. 29.95"
              step={0.01}
              value={f.fortnightlyPrice}
              onValueChange={v => patch(f.id, { fortnightlyPrice: v })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Annual discount (%)</span>
            <NumberInput
              className={FF_INPUT}
              max={100}
              min={0}
              placeholder="e.g. 15"
              value={f.annualDiscountPct}
              onValueChange={v => patch(f.id, { annualDiscountPct: v })}
            />
          </label>
        </div>

        <SectionLabel>Capacity &amp; Access</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
              {f.type === 'gym' ? 'Total capacity (members)' : 'Seating capacity'}
            </span>
            <NumberInput
              className={FF_INPUT}
              min={1}
              value={f.type === 'gym' ? f.totalCapacity : (f.seatingCapacity ?? 0)}
              onValueChange={v => patch(f.id, f.type === 'gym' ? { totalCapacity: v } : { seatingCapacity: v })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Max concurrent users</span>
            <NumberInput
              className={FF_INPUT}
              min={1}
              value={f.concurrentCapacity}
              onValueChange={v => patch(f.id, { concurrentCapacity: v })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Slot duration</span>
            <select
              className={FF_INPUT}
              value={f.slotDuration}
              onChange={e => patch(f.id, { slotDuration: e.target.value })}
            >
              {SLOT_OPTIONS.map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        </div>

        <SectionLabel>Guest Access</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
              Guest session price ($)
            </span>
            <NumberInput
              className={FF_INPUT}
              min={0}
              step={0.01}
              value={f.guestSessionPrice}
              onValueChange={v => patch(f.id, { guestSessionPrice: v })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
              Free guest visits / month
            </span>
            <NumberInput
              className={FF_INPUT}
              min={0}
              value={f.freeGuestVisits}
              onValueChange={v => patch(f.id, { freeGuestVisits: v })}
            />
          </label>
        </div>

        <SectionLabel>Operating Hours</SectionLabel>
        <OperatingHours f={f} patch={patch} />
        <PhotoUpload photos={f.photos} onChange={photos => patch(f.id, { photos })} />
      </>
    );
  };

  return (
    <div>
      <div
        className="rounded-lg border border-[#b3b7d4] bg-[#ecedf4] px-3.5 py-3 text-xs text-[#21295a]"
        style={{ marginBottom: 16 }}
      >
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
              <label className="relative inline-block h-[22px] w-10 flex-shrink-0 cursor-pointer">
                <input
                  aria-label={`Enable ${panel.title}`}
                  checked={enabled}
                  className="peer sr-only"
                  type="checkbox"
                  onChange={e => toggleType(panel.type, panel.multi, e.target.checked)}
                />
                <span className="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-navy" />
                <span className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-[18px]" />
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
  <label className="flex flex-col gap-1" style={{ marginBottom: 12 }}>
    <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Operating hours</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        className={FF_INPUT}
        style={{ width: 130 }}
        type="time"
        value={f.openTime}
        onChange={e => patch(f.id, { openTime: e.target.value })}
      />
      <span style={{ fontSize: 12, color: 'var(--sub)' }}>to</span>
      <input
        className={FF_INPUT}
        style={{ width: 130 }}
        type="time"
        value={f.closeTime}
        onChange={e => patch(f.id, { closeTime: e.target.value })}
      />
    </div>
  </label>
);

export default AdditionalFacilitiesStep;
