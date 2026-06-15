import React, { useMemo, useState } from 'react';

import { savePlan } from '../usePlans';

import type { AccessType, MembershipPlan } from '../types';

interface Props {
  mode: 'create' | 'edit';
  plan: MembershipPlan | null;
  onClose: () => void;
  onSaved: (plan: MembershipPlan) => void;
}

const ACCESS_LABELS: Record<AccessType, string> = {
  '24/7': '24/7',
  offpeak: '9am–3pm Mon–Fri & 11pm–6am Mon–Sun',
  nightowl: '11pm–6am only',
  custom: 'Custom hours',
};

const blankPlan: MembershipPlan = {
  id: '',
  name: '',
  code: '',
  description: '',
  colour: '#21295A',
  fortnightlyPrice: 0,
  annualPrice: 0,
  accessType: '24/7',
  accessHours: '24/7',
  peakAccess: true,
  slotsPerCycle: 0,
  dailyBookingLimit: 1,
  maxFutureBookings: 2,
  carryover: 0,
  carryCap: 0,
  advanceWindowDays: 7,
  extraSessionEnabled: true,
  extraSessionPrice: 30,
  eligibility: { adult: true, junior: false, family: false },
  additionalMemberFee: null,
  memberCap: 0,
  centresActive: 0,
  regions: ['all'],
  status: 'active',
};

const PlanDrawer: React.FC<Props> = ({ mode, plan, onClose, onSaved }) => {
  const [form, setForm] = useState<MembershipPlan>(plan ?? blankPlan);
  const [customStart, setCustomStart] = useState('09:00');
  const [customEnd, setCustomEnd] = useState('21:00');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof MembershipPlan>(key: K, value: MembershipPlan[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const num = (v: string) => (v === '' ? 0 : Number(v));

  const isValid = useMemo(() => form.name.trim() !== '' && form.code.trim() !== '', [form.name, form.code]);

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    const accessHours = form.accessType === 'custom' ? `${customStart}–${customEnd}` : ACCESS_LABELS[form.accessType];
    const finalPlan: MembershipPlan = {
      ...form,
      id: form.id || form.code.trim().toLowerCase().replace(/\s+/g, '-'),
      accessHours,
    };
    await savePlan(finalPlan);
    setSaving(false);
    onSaved(finalPlan);
  };

  return (
    <>
      <div
        aria-label="Close plan editor"
        className="cmx-overlay"
        role="button"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
        }}
      />
      <div className="cmx-drawer" style={{ width: 620 }}>
        {/* Header */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: '#fff',
            borderBottom: '1px solid var(--border)',
            padding: '18px 26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
              {mode === 'edit' ? `Edit ${plan?.name ?? 'Plan'}` : 'New Plan'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>
              {mode === 'edit' ? 'Update this global plan template' : 'Define a new global plan template'}
            </div>
          </div>
          <button
            style={{
              width: 32,
              height: 32,
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
              color: 'var(--sub)',
              fontSize: 18,
            }}
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 26 }}>
          {/* Identity */}
          <div className="cmx-eyebrow">Plan Identity</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Plan Name *</span>
              <input
                placeholder="e.g. Premium"
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Plan Code *</span>
              <input
                placeholder="e.g. premium"
                style={{ textTransform: 'lowercase' }}
                type="text"
                value={form.code}
                onChange={e => set('code', e.target.value)}
              />
              <div className="cmx-hint">Used in system references. Lowercase, no spaces.</div>
            </div>
          </div>
          <div className="cmx-ff" style={{ marginBottom: 20 }}>
            <span className="cmx-fld-lbl">Description</span>
            <textarea
              placeholder="Brief description shown in member-facing plan comparison pages…"
              style={{ resize: 'vertical', minHeight: 64 }}
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Pricing */}
          <div className="cmx-eyebrow">Pricing</div>
          <div className="cmx-note" style={{ marginBottom: 14 }}>
            These are network-level reference prices (USD). The actual price charged to members is set per centre when
            the plan is assigned in Centre Management.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Fortnightly Price (USD) *</span>
              <input
                min={0}
                placeholder="e.g. 59.95"
                step="0.01"
                type="number"
                value={form.fortnightlyPrice || ''}
                onChange={e => set('fortnightlyPrice', num(e.target.value))}
              />
            </div>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Annual Price (USD)</span>
              <input
                min={0}
                placeholder="e.g. 2493.92"
                step="0.01"
                type="number"
                value={form.annualPrice || ''}
                onChange={e => set('annualPrice', num(e.target.value))}
              />
            </div>
          </div>

          {/* Access */}
          <div className="cmx-eyebrow">Access Hours</div>
          <div className="cmx-ff" style={{ marginBottom: 14 }}>
            <span className="cmx-fld-lbl">Access Type *</span>
            <select value={form.accessType} onChange={e => set('accessType', e.target.value as AccessType)}>
              <option value="24/7">Full 24/7 access</option>
              <option value="offpeak">Off-Peak only — 9am–3pm Mon–Fri &amp; 11pm–6am Mon–Sun</option>
              <option value="nightowl">Night Owl only — 11pm–6am (all days)</option>
              <option value="custom">Custom hours</option>
            </select>
          </div>
          {form.accessType === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="cmx-ff">
                <span className="cmx-fld-lbl">Start Time</span>
                <input type="time" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              </div>
              <div className="cmx-ff">
                <span className="cmx-fld-lbl">End Time</span>
                <input type="time" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </div>
            </div>
          )}
          <div className="cmx-ff" style={{ marginBottom: 20 }}>
            <span className="cmx-fld-lbl">Peak Hours Access</span>
            <select value={form.peakAccess ? 'yes' : 'no'} onChange={e => set('peakAccess', e.target.value === 'yes')}>
              <option value="yes">Yes — full peak hours access</option>
              <option value="no">No — off-peak / restricted hours only</option>
            </select>
          </div>

          {/* Booking limits */}
          <div className="cmx-eyebrow">Booking Limits (per fortnightly cycle)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Slots per Cycle *</span>
              <input
                min={0}
                placeholder="0 = unlimited"
                type="number"
                value={form.slotsPerCycle || ''}
                onChange={e => set('slotsPerCycle', num(e.target.value))}
              />
              <div className="cmx-hint">0 = unlimited (e.g. Off Peak)</div>
            </div>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Daily Booking Limit</span>
              <input
                min={1}
                type="number"
                value={form.dailyBookingLimit}
                onChange={e => set('dailyBookingLimit', num(e.target.value))}
              />
            </div>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Max Active Future Bookings</span>
              <input
                min={1}
                type="number"
                value={form.maxFutureBookings}
                onChange={e => set('maxFutureBookings', num(e.target.value))}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Carryover per Cycle</span>
              <input
                min={0}
                placeholder="0 = no carryover"
                type="number"
                value={form.carryover || ''}
                onChange={e => set('carryover', num(e.target.value))}
              />
              <div className="cmx-hint">Unused slots → next cycle</div>
            </div>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Max Accumulated (carry cap)</span>
              <input
                min={0}
                placeholder="e.g. 4"
                type="number"
                value={form.carryCap || ''}
                onChange={e => set('carryCap', num(e.target.value))}
              />
              <div className="cmx-hint">Max slots that can accumulate</div>
            </div>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Advance Booking Window (days)</span>
              <input
                min={1}
                type="number"
                value={form.advanceWindowDays}
                onChange={e => set('advanceWindowDays', num(e.target.value))}
              />
            </div>
          </div>

          {/* Extra session */}
          <div className="cmx-eyebrow">Extra Session Purchase (Fortnightly only)</div>
          <div className="cmx-note" style={{ marginBottom: 14 }}>
            When a member exhausts their fortnightly cycle limit, they can purchase an additional session. Not available
            on annual plans.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Extra Session</span>
              <select
                value={form.extraSessionEnabled ? 'yes' : 'no'}
                onChange={e => set('extraSessionEnabled', e.target.value === 'yes')}
              >
                <option value="yes">Enabled</option>
                <option value="no">Disabled</option>
              </select>
            </div>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Default Extra Session Price (USD)</span>
              <input
                disabled={!form.extraSessionEnabled}
                min={0}
                step="0.01"
                type="number"
                value={form.extraSessionPrice || ''}
                onChange={e => set('extraSessionPrice', num(e.target.value))}
              />
            </div>
          </div>

          {/* Eligibility */}
          <div className="cmx-eyebrow">Member Eligibility</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {(['adult', 'junior', 'family'] as const).map(key => (
              <label key={key} className={`cmx-check-chip ${form.eligibility[key] ? 'on' : ''}`}>
                <input
                  checked={form.eligibility[key]}
                  type="checkbox"
                  onChange={e => set('eligibility', { ...form.eligibility, [key]: e.target.checked })}
                />
                {key === 'adult' ? 'Adult (16+)' : key === 'junior' ? 'Junior (under 16)' : 'Family plan'}
              </label>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Additional Member Fee (Family)</span>
              <input
                min={0}
                placeholder="e.g. 10 — leave blank if N/A"
                step="0.01"
                type="number"
                value={form.additionalMemberFee ?? ''}
                onChange={e => set('additionalMemberFee', e.target.value === '' ? null : num(e.target.value))}
              />
            </div>
            <div className="cmx-ff">
              <span className="cmx-fld-lbl">Network-wide Member Cap</span>
              <input
                min={0}
                placeholder="0 = unlimited"
                type="number"
                value={form.memberCap || ''}
                onChange={e => set('memberCap', num(e.target.value))}
              />
              <div className="cmx-hint">Per-centre cap set in Centre Management</div>
            </div>
          </div>

          {/* Status */}
          <div className="cmx-eyebrow">Plan Status</div>
          <div className="cmx-ff" style={{ marginBottom: 26 }}>
            <select value={form.status} onChange={e => set('status', e.target.value as MembershipPlan['status'])}>
              <option value="active">Active — assignable to centres and purchasable</option>
              <option value="archived">Archived — hidden from new assignments</option>
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="cmx-btn cmx-btn-outline" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="cmx-btn cmx-btn-navy"
              disabled={!isValid || saving}
              style={{ padding: '8px 20px' }}
              type="button"
              onClick={handleSave}
            >
              {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlanDrawer;
