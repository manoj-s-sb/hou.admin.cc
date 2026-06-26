import React, { useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { createMembership, updateMembership } from '../../../store/memberships/api';
import { AppDispatch } from '../../../store/store';

import type { AccessType, MembershipPlan } from '../../../store/memberships/types';

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

const FIELD =
  'w-full rounded-[7px] border border-cmx-border bg-white px-2.5 py-2 text-[13px] text-cmx-text outline-none focus:border-cmx-blue focus:shadow-[0_0_0_2px_rgba(37,99,235,0.1)] disabled:bg-gray-50 disabled:text-muted';

const PlanDrawer: React.FC<Props> = ({ mode, plan, onClose, onSaved }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [form, setForm] = useState<MembershipPlan>(plan ?? blankPlan);
  const [customStart, setCustomStart] = useState('09:00');
  const [customEnd, setCustomEnd] = useState('21:00');
  const [saving, setSaving] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const set = <K extends keyof MembershipPlan>(key: K, value: MembershipPlan[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const num = (v: string) => (v === '' ? 0 : Number(v));

  const isValid = useMemo(() => form.name.trim() !== '' && form.code.trim() !== '', [form.name, form.code]);

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    setCodeError(null);
    const accessHours = form.accessType === 'custom' ? `${customStart}–${customEnd}` : ACCESS_LABELS[form.accessType];
    const finalPlan: MembershipPlan = {
      ...form,
      code: form.code.trim().toLowerCase(),
      id: form.id || form.code.trim().toLowerCase().replace(/\s+/g, '-'),
      accessHours,
    };

    if (mode === 'create') {
      const res = await dispatch(
        createMembership({ plan: finalPlan, customHours: { start: customStart, end: customEnd } })
      ).unwrap();
      setSaving(false);
      switch (res.status) {
        case 'ok':
          toast.success('Plan created');
          onSaved(finalPlan);
          break;
        case 'duplicate':
          setCodeError('A plan with that code already exists');
          break;
        case 'validation':
          if (res.fields.some(f => f.toLowerCase().includes('code'))) setCodeError('Please check the plan code');
          toast.error(res.fields.length ? `Please fix: ${res.fields.join(', ')}` : 'Please check the form fields');
          break;
        case 'auth':
          toast.error('Permission denied — a superadmin session is required (or it has expired).');
          break;
        default:
          toast.error('Could not create the plan. Please try again.');
      }
      return;
    }

    // Edit mode → update endpoint.
    const ok = await dispatch(updateMembership(finalPlan)).unwrap();
    setSaving(false);
    if (ok) {
      toast.success('Plan updated');
      onSaved(finalPlan);
    } else {
      toast.error('Could not save changes. Please try again.');
    }
  };

  return (
    <div className="font-sans text-sm text-cmx-text">
      <button
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--sub)',
          fontSize: 12.5,
          fontWeight: 600,
          padding: 0,
          marginBottom: 12,
        }}
        type="button"
        onClick={onClose}
      >
        <svg fill="none" height={14} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={14}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Membership Plans
      </button>
      <div className="relative w-full animate-cmx-fade-in overflow-hidden rounded-xl border border-cmx-border bg-white text-cmx-text">
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
          <div className="text-xs font-bold uppercase tracking-[0.06em] text-sub">Plan Identity</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Plan Name *</span>
              <input
                className={FIELD}
                placeholder="e.g. Premium"
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Plan Code *</span>
              <input
                className={FIELD}
                placeholder="e.g. premium"
                style={{ textTransform: 'lowercase', ...(codeError ? { borderColor: '#d42b2b' } : {}) }}
                type="text"
                value={form.code}
                onChange={e => {
                  set('code', e.target.value);
                  if (codeError) setCodeError(null);
                }}
              />
              {codeError ? (
                <div className="mt-[3px] text-[11px] text-sub" style={{ color: '#d42b2b' }}>
                  {codeError}
                </div>
              ) : (
                <div className="mt-[3px] text-[11px] text-sub">Used in system references. Lowercase, no spaces.</div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1" style={{ marginBottom: 20 }}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Description</span>
            <textarea
              className={FIELD}
              placeholder="Brief description shown in member-facing plan comparison pages…"
              style={{ resize: 'vertical', minHeight: 64 }}
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Pricing */}
          <div className="text-xs font-bold uppercase tracking-[0.06em] text-sub">Pricing</div>
          <div
            className="rounded-lg border border-[#b3b7d4] bg-[#ecedf4] px-3.5 py-3 text-xs text-[#21295a]"
            style={{ marginBottom: 14 }}
          >
            These are network-level reference prices (USD). The actual price charged to members is set per centre when
            the plan is assigned in Centre Management.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
                Fortnightly Price (USD) *
              </span>
              <input
                className={FIELD}
                min={0}
                placeholder="e.g. 59.95"
                step="0.01"
                type="number"
                value={form.fortnightlyPrice || ''}
                onChange={e => set('fortnightlyPrice', num(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Annual Price (USD)</span>
              <input
                className={FIELD}
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
          <div className="text-xs font-bold uppercase tracking-[0.06em] text-sub">Access Hours</div>
          <div className="flex flex-col gap-1" style={{ marginBottom: 14 }}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Access Type *</span>
            <select
              className={FIELD}
              value={form.accessType}
              onChange={e => set('accessType', e.target.value as AccessType)}
            >
              <option value="24/7">Full 24/7 access</option>
              <option value="offpeak">Off-Peak only — 9am–3pm Mon–Fri &amp; 11pm–6am Mon–Sun</option>
              <option value="nightowl">Night Owl only — 11pm–6am (all days)</option>
              <option value="custom">Custom hours</option>
            </select>
          </div>
          {form.accessType === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Start Time</span>
                <input
                  className={FIELD}
                  type="time"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">End Time</span>
                <input className={FIELD} type="time" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1" style={{ marginBottom: 20 }}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Peak Hours Access</span>
            <select
              className={FIELD}
              value={form.peakAccess ? 'yes' : 'no'}
              onChange={e => set('peakAccess', e.target.value === 'yes')}
            >
              <option value="yes">Yes — full peak hours access</option>
              <option value="no">No — off-peak / restricted hours only</option>
            </select>
          </div>

          {/* Booking limits */}
          <div className="text-xs font-bold uppercase tracking-[0.06em] text-sub">
            Booking Limits (per fortnightly cycle)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Slots per Cycle *</span>
              <input
                className={FIELD}
                min={0}
                placeholder="0 = unlimited"
                type="number"
                value={form.slotsPerCycle || ''}
                onChange={e => set('slotsPerCycle', num(e.target.value))}
              />
              <div className="mt-[3px] text-[11px] text-sub">0 = unlimited (e.g. Off Peak)</div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
                Daily Booking Limit
              </span>
              <input
                className={FIELD}
                min={1}
                type="number"
                value={form.dailyBookingLimit}
                onChange={e => set('dailyBookingLimit', num(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
                Max Active Future Bookings
              </span>
              <input
                className={FIELD}
                min={1}
                type="number"
                value={form.maxFutureBookings}
                onChange={e => set('maxFutureBookings', num(e.target.value))}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
                Carryover per Cycle
              </span>
              <input
                className={FIELD}
                min={0}
                placeholder="0 = no carryover"
                type="number"
                value={form.carryover || ''}
                onChange={e => set('carryover', num(e.target.value))}
              />
              <div className="mt-[3px] text-[11px] text-sub">Unused slots → next cycle</div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
                Max Accumulated (carry cap)
              </span>
              <input
                className={FIELD}
                min={0}
                placeholder="e.g. 4"
                type="number"
                value={form.carryCap || ''}
                onChange={e => set('carryCap', num(e.target.value))}
              />
              <div className="mt-[3px] text-[11px] text-sub">Max slots that can accumulate</div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
                Advance Booking Window (days)
              </span>
              <input
                className={FIELD}
                min={1}
                type="number"
                value={form.advanceWindowDays}
                onChange={e => set('advanceWindowDays', num(e.target.value))}
              />
            </div>
          </div>

          {/* Extra session */}
          <div className="text-xs font-bold uppercase tracking-[0.06em] text-sub">
            Extra Session Purchase (Fortnightly only)
          </div>
          <div
            className="rounded-lg border border-[#b3b7d4] bg-[#ecedf4] px-3.5 py-3 text-xs text-[#21295a]"
            style={{ marginBottom: 14 }}
          >
            When a member exhausts their fortnightly cycle limit, they can purchase an additional session. Not available
            on annual plans.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">Extra Session</span>
              <select
                className={FIELD}
                value={form.extraSessionEnabled ? 'yes' : 'no'}
                onChange={e => set('extraSessionEnabled', e.target.value === 'yes')}
              >
                <option value="yes">Enabled</option>
                <option value="no">Disabled</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
                Default Extra Session Price (USD)
              </span>
              <input
                className={FIELD}
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
          <div className="text-xs font-bold uppercase tracking-[0.06em] text-sub">Member Eligibility</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {(['adult', 'junior', 'family'] as const).map(key => (
              <label
                key={key}
                className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-[7px] border px-2.5 py-1.5 text-xs font-medium transition-all ${form.eligibility[key] ? 'border-[#9096be] bg-cmx-blue-light text-cmx-blue' : 'border-cmx-border bg-white text-sub'}`}
              >
                <input
                  checked={form.eligibility[key]}
                  className="h-[13px] w-[13px] accent-cmx-blue"
                  type="checkbox"
                  onChange={e => set('eligibility', { ...form.eligibility, [key]: e.target.checked })}
                />
                {key === 'adult' ? 'Adult (16+)' : key === 'junior' ? 'Junior (under 16)' : 'Family plan'}
              </label>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
                Additional Member Fee (Family)
              </span>
              <input
                className={FIELD}
                min={0}
                placeholder="e.g. 10 — leave blank if N/A"
                step="0.01"
                type="number"
                value={form.additionalMemberFee ?? ''}
                onChange={e => set('additionalMemberFee', e.target.value === '' ? null : num(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-sub">
                Network-wide Member Cap
              </span>
              <input
                className={FIELD}
                min={0}
                placeholder="0 = unlimited"
                type="number"
                value={form.memberCap || ''}
                onChange={e => set('memberCap', num(e.target.value))}
              />
              <div className="mt-[3px] text-[11px] text-sub">Per-centre cap set in Centre Management</div>
            </div>
          </div>

          {/* Status */}
          <div className="text-xs font-bold uppercase tracking-[0.06em] text-sub">Plan Status</div>
          <div className="flex flex-col gap-1" style={{ marginBottom: 26 }}>
            <select
              className={FIELD}
              value={form.status}
              onChange={e => set('status', e.target.value as MembershipPlan['status'])}
            >
              <option value="active">Active — assignable to centres and purchasable</option>
              <option value="archived">Archived — hidden from new assignments</option>
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] border border-cmx-border bg-white px-3.5 py-2 text-[12.5px] font-semibold text-sub transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] bg-navy px-3.5 py-2 text-[12.5px] font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
    </div>
  );
};

export default PlanDrawer;
