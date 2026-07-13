import React from 'react';

import { COUNTRIES, DAYS, TIMEZONES } from '../constants';

import { type SaveStatus } from './wizardHelpers';

import type { WizardState } from '../../../store/centres/types';

type HourPatch = Partial<{ openTime: string; closeTime: string; isOpen: boolean }>;

interface Props {
  s: WizardState;
  set: (patch: Partial<WizardState>) => void;
  err: (cond: boolean) => React.CSSProperties | undefined;
  setHour: (day: number, patch: HourPatch) => void;
  onCityChange: (city: string) => void;
  goStep: (n: number) => void;
  firstFieldRef: React.MutableRefObject<HTMLInputElement | null>;
  showErrors: boolean;
  shortCodeValid: boolean;
  emailValid: boolean;
}

/** Wizard Step 1 — Identity, address, contact, hours. Extracted from NewCentreWizard; body unchanged. */
const Step1Identity: React.FC<Props> = ({
  s,
  set,
  err,
  setHour,
  onCityChange,
  goStep,
  firstFieldRef,
  showErrors,
  shortCodeValid,
  emailValid,
}) => (
  <div>
    <div className="cmx-eyebrow" style={{ marginBottom: 14 }}>
      Centre Identity
    </div>
    <div className="flex flex-col gap-1" style={{ marginBottom: 14 }}>
      <span className="cmx-field-label">Centre Name *</span>
      <input
        ref={firstFieldRef}
        className="cmx-field"
        placeholder="e.g. Century Cricket Centre — Dallas"
        style={err(!s.name.trim())}
        type="text"
        value={s.name}
        onChange={e => set({ name: e.target.value })}
      />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Short Code *</span>
        <input
          className="cmx-field"
          maxLength={6}
          placeholder="e.g. DAL001"
          style={{ textTransform: 'uppercase', ...(err(!shortCodeValid || !s.shortCode) || {}) }}
          type="text"
          value={s.shortCode}
          onChange={e => set({ shortCode: e.target.value.toUpperCase() })}
        />
        <div className="cmx-hint">
          Used in booking references. 3–6 uppercase letters/numbers. Immutable after activation.
        </div>
        {showErrors && s.shortCode && !shortCodeValid && (
          <div style={{ fontSize: 11, color: '#dc2626' }}>Must be 3–6 uppercase letters/numbers.</div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Status</span>
        <select className="cmx-field" value={s.status} onChange={e => set({ status: e.target.value as SaveStatus })}>
          <option value="draft">Draft (not visible to members)</option>
          <option value="active">Active (go live immediately)</option>
          <option value="suspended">Suspended (taken offline)</option>
        </select>
      </div>
    </div>

    <div className="cmx-eyebrow" style={{ margin: '20px 0 14px' }}>
      Address
    </div>
    <div className="flex flex-col gap-1" style={{ marginBottom: 14 }}>
      <span className="cmx-field-label">Address Line 1 *</span>
      <input
        className="cmx-field"
        placeholder="Street address"
        style={err(!s.addressLine1.trim())}
        type="text"
        value={s.addressLine1}
        onChange={e => set({ addressLine1: e.target.value })}
      />
    </div>
    <div className="flex flex-col gap-1" style={{ marginBottom: 14 }}>
      <span className="cmx-field-label">Address Line 2</span>
      <input
        className="cmx-field"
        placeholder="Suite, unit, floor (optional)"
        type="text"
        value={s.addressLine2}
        onChange={e => set({ addressLine2: e.target.value })}
      />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">City *</span>
        <input
          className="cmx-field"
          placeholder="e.g. Dallas"
          style={err(!s.city.trim())}
          type="text"
          value={s.city}
          onChange={e => onCityChange(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">State / Province</span>
        <input
          className="cmx-field"
          placeholder="e.g. TX"
          type="text"
          value={s.state}
          onChange={e => set({ state: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Postcode *</span>
        <input
          className="cmx-field"
          placeholder="e.g. 75201"
          style={err(!s.postcode.trim())}
          type="text"
          value={s.postcode}
          onChange={e => set({ postcode: e.target.value })}
        />
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Country *</span>
        <select
          className="cmx-field"
          style={err(!s.country)}
          value={s.country}
          onChange={e => set({ country: e.target.value })}
        >
          <option value="">Select country…</option>
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Time Zone *</span>
        <select
          className="cmx-field"
          style={err(!s.timezone)}
          value={s.timezone}
          onChange={e => set({ timezone: e.target.value })}
        >
          <option value="">Select timezone…</option>
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div className="cmx-eyebrow" style={{ margin: '20px 0 14px' }}>
      Contact
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Phone *</span>
        <input
          className="cmx-field"
          placeholder="+1 555 000 0000"
          style={err(!s.phone.trim())}
          type="tel"
          value={s.phone}
          onChange={e => set({ phone: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="cmx-field-label">Email *</span>
        <input
          className="cmx-field"
          placeholder="dallas@centurycricket.com"
          style={err(!s.email.trim() || !emailValid)}
          type="email"
          value={s.email}
          onChange={e => set({ email: e.target.value })}
        />
        {showErrors && s.email && !emailValid && (
          <div style={{ fontSize: 11, color: '#dc2626' }}>Enter a valid email address.</div>
        )}
      </div>
    </div>

    <div className="cmx-eyebrow" style={{ margin: '20px 0 14px' }}>
      Operating Hours
    </div>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#e6f4f4',
        border: '1px solid #99d9d8',
        borderRadius: 8,
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#006e6c' }}>Open 24/7</div>
        <div style={{ fontSize: 11, color: '#008482', marginTop: 2 }}>
          Centre operates around the clock — no closing hours
        </div>
      </div>
      <label className="relative inline-block h-[22px] w-10 flex-shrink-0 cursor-pointer">
        <input
          aria-label="Open 24/7"
          checked={s.is24x7}
          className="peer sr-only"
          type="checkbox"
          onChange={e => set({ is24x7: e.target.checked })}
        />
        <span className="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-cmx-green" />
        <span className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-[18px]" />
      </label>
    </div>

    {!s.is24x7 && (
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 1fr 60px',
            background: '#f9fafb',
            padding: '8px 14px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--sub)',
            textTransform: 'uppercase',
            letterSpacing: '.04em',
          }}
        >
          <div>Day</div>
          <div>Open</div>
          <div>Close</div>
          <div>Open?</div>
        </div>
        {s.operatingHours.map((h, i) => (
          <div
            key={h.day}
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 1fr 60px',
              padding: '8px 14px',
              borderTop: '1px solid var(--border)',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{DAYS[i]}</div>
            <div style={{ paddingRight: 10 }}>
              <input
                aria-disabled={!h.isOpen}
                disabled={!h.isOpen}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 12.5,
                  opacity: h.isOpen ? 1 : 0.4,
                }}
                type="time"
                value={h.openTime}
                onChange={e => setHour(h.day, { openTime: e.target.value })}
              />
            </div>
            <div style={{ paddingRight: 10 }}>
              <input
                aria-disabled={!h.isOpen}
                disabled={!h.isOpen}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 12.5,
                  opacity: h.isOpen ? 1 : 0.4,
                }}
                type="time"
                value={h.closeTime}
                onChange={e => setHour(h.day, { closeTime: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <label className="relative inline-block h-[22px] w-10 flex-shrink-0 cursor-pointer">
                <input
                  aria-label={`${DAYS[i]} open`}
                  checked={h.isOpen}
                  className="peer sr-only"
                  type="checkbox"
                  onChange={e => setHour(h.day, { isOpen: e.target.checked })}
                />
                <span className="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-cmx-green" />
                <span className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-[18px]" />
              </label>
            </div>
          </div>
        ))}
      </div>
    )}

    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <button className="cmx-btn cmx-btn-navy" type="button" onClick={() => goStep(2)}>
        Next: Facilities →
      </button>
    </div>
  </div>
);

export default Step1Identity;
