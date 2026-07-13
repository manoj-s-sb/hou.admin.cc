import React from 'react';

import NumberInput from '../../../components/NumberInput';
import { DEMOGRAPHICS, PLAN_CATALOGUE, PLAN_COUNTRY_CHIPS } from '../constants';

import AllocationBar from './AllocationBar';
import { toggleCountry } from './wizardHelpers';

import type { CentreDiscount, WizardPlanRow, WizardState } from '../../../store/centres/types';

interface Props {
  s: WizardState;
  set: (patch: Partial<WizardState>) => void;
  capacity: number;
  demo: string;
  setDemo: (d: string) => void;
  visiblePlans: typeof PLAN_CATALOGUE;
  setPlan: (planId: string, patch: Partial<WizardPlanRow>) => void;
  addDiscount: () => void;
  goStep: (n: number) => void;
}

/** Wizard Step 4 — Plans & Pricing. Extracted from NewCentreWizard; body unchanged. */
const Step4Plans: React.FC<Props> = ({
  s,
  set,
  capacity,
  demo,
  setDemo,
  visiblePlans,
  setPlan,
  addDiscount,
  goStep,
}) => (
  <div>
    <div className="cmx-note" style={{ marginBottom: 16 }}>
      Select which global plans to offer at this centre. Set the local price and allocate capacity slots for each. The
      sum of allocated slots must not exceed the overall centre capacity.
    </div>

    {/* Demographic filter */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        padding: '12px 14px',
        background: '#f9fafb',
        border: '1px solid var(--border)',
        borderRadius: 10,
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--sub)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
          }}
        >
          Filter by demographic:
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DEMOGRAPHICS.map(d => (
            <button
              key={d.key}
              className={`cursor-pointer whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                demo === d.key ? 'border-navy bg-navy text-white' : 'border-cmx-border bg-white text-sub'
              }`}
              type="button"
              onClick={() => setDemo(d.key)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--sub)' }}>
        Showing {visiblePlans.length} plan{visiblePlans.length === 1 ? '' : 's'}
      </div>
    </div>

    {/* Plan rows */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
      {PLAN_CATALOGUE.map(meta => {
        const row = s.plans.find(p => p.planId === meta.id);
        const visible = visiblePlans.some(p => p.id === meta.id);
        if (!visible || !row) return null;
        return (
          <div
            key={meta.id}
            style={{
              border: `2px solid ${row.enabled ? meta.colour : 'var(--border)'}`,
              borderRadius: 10,
              padding: '14px 16px',
              background: '#fff',
              transition: 'border-color .15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                <input
                  checked={row.enabled}
                  style={{ width: 16, height: 16, accentColor: meta.colour }}
                  type="checkbox"
                  onChange={e => setPlan(meta.id, { enabled: e.target.checked })}
                />
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: meta.colour,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{meta.name}</span>
                <span style={{ fontSize: 11, color: 'var(--sub)' }}>· {meta.access}</span>
              </label>
              <div style={{ fontSize: 12, color: 'var(--sub)' }}>
                Fortnightly: ${meta.fortnightly} · Annual: ${meta.annual.toLocaleString()}
              </div>
            </div>

            {row.enabled && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    gap: 12,
                    alignItems: 'end',
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="cmx-field-label">Fortnightly Price *</span>
                    <NumberInput
                      className="cmx-field"
                      min={0}
                      step={0.01}
                      value={row.fortnightlyPrice}
                      onValueChange={v => setPlan(meta.id, { fortnightlyPrice: v })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="cmx-field-label">Annual Price</span>
                    <NumberInput
                      className="cmx-field"
                      min={0}
                      step={0.01}
                      value={row.annualPrice}
                      onValueChange={v => setPlan(meta.id, { annualPrice: v })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="cmx-field-label">Allocated Slots *</span>
                    <NumberInput
                      className="cmx-field"
                      min={1}
                      value={row.allocatedSlots}
                      onValueChange={v => setPlan(meta.id, { allocatedSlots: v })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="cmx-field-label">Foundation Eligible</span>
                    <select
                      className="cmx-field"
                      value={row.isFoundationEligible ? 'yes' : 'no'}
                      onChange={e => setPlan(meta.id, { isFoundationEligible: e.target.value === 'yes' })}
                    >
                      <option value="yes">Yes — included</option>
                      <option value="no">No — not included</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10 }}>
                  <div className="flex flex-col gap-1">
                    <span className="cmx-field-label">Member Cap</span>
                    <input
                      className="cmx-field"
                      min={1}
                      placeholder="Blank = plan cap"
                      type="number"
                      value={row.memberCap ?? ''}
                      onChange={e =>
                        setPlan(meta.id, {
                          memberCap: e.target.value === '' ? null : Math.max(1, Number(e.target.value)),
                        })
                      }
                    />
                    {row.memberCap !== null && row.memberCap !== undefined && row.memberCap > row.allocatedSlots && (
                      <div style={{ fontSize: 11, color: '#d97706' }}>
                        Cap exceeds allocated slots ({row.allocatedSlots}).
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="cmx-field-label">First Guest Fee (USD)</span>
                    <input
                      className="cmx-field"
                      min={0}
                      placeholder="Blank = not set"
                      step={0.01}
                      type="number"
                      value={row.firstGuestFee ?? ''}
                      onChange={e =>
                        setPlan(meta.id, {
                          firstGuestFee: e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="cmx-field-label">Add. Guest Discount (%)</span>
                    <input
                      className="cmx-field"
                      max={100}
                      min={0}
                      placeholder="Blank = not set"
                      type="number"
                      value={row.additionalGuestDiscountPct ?? ''}
                      onChange={e =>
                        setPlan(meta.id, {
                          additionalGuestDiscountPct:
                            e.target.value === '' ? null : Math.min(100, Math.max(0, Number(e.target.value))),
                        })
                      }
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                  <div className="flex flex-col gap-1">
                    <span className="cmx-field-label">Extra Session Cost (USD)</span>
                    <input
                      className="cmx-field"
                      min={0}
                      placeholder="Blank = not set"
                      step={0.01}
                      type="number"
                      value={row.extraSessionCost ?? ''}
                      onChange={e =>
                        setPlan(meta.id, {
                          extraSessionCost: e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="cmx-field-label">Joining Fee (USD)</span>
                    <NumberInput
                      className="cmx-field"
                      min={0}
                      placeholder="0 = no joining fee"
                      step={0.01}
                      value={row.joiningFee}
                      onValueChange={v => setPlan(meta.id, { joiningFee: v })}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <span className="cmx-field-label">Available in</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {PLAN_COUNTRY_CHIPS.map(c => {
                      const active = row.availableCountries.includes(c.code);
                      return (
                        <button
                          key={c.code}
                          className={`inline-flex cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded-full border border-cmx-border bg-white px-2.5 py-1 text-xs font-medium text-sub transition-all ${
                            active ? 'border-[#9096be] bg-[#ecedf4] text-[#21295a]' : ''
                          }`}
                          type="button"
                          onClick={() =>
                            setPlan(meta.id, {
                              availableCountries: toggleCountry(row.availableCountries, c.code),
                            })
                          }
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="cmx-hint">
                    Select specific countries or keep &quot;All countries&quot; to offer this plan everywhere.
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Live allocation bar */}
    <div style={{ marginBottom: 20 }}>
      <AllocationBar capacity={capacity} plans={s.plans} />
    </div>

    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 20px' }} />

    <div className="cmx-eyebrow" style={{ marginBottom: 6 }}>
      Centre Discounts
    </div>
    <div style={{ fontSize: 12.5, color: 'var(--sub)', marginBottom: 12 }}>
      Optional — add centre-specific discounts.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
      {s.discounts.map(d => (
        <div
          key={d.id}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 16px',
            position: 'relative',
          }}
        >
          <button
            style={{
              position: 'absolute',
              top: 10,
              right: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: 16,
            }}
            type="button"
            onClick={() => set({ discounts: s.discounts.filter(x => x.id !== d.id) })}
          >
            ×
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
            <div className="flex flex-col gap-1">
              <span className="cmx-field-label">Discount Name *</span>
              <input
                className="cmx-field"
                placeholder="e.g. Senior Concession"
                type="text"
                value={d.name}
                onChange={e =>
                  set({
                    discounts: s.discounts.map(x => (x.id === d.id ? { ...x, name: e.target.value } : x)),
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="cmx-field-label">Type *</span>
              <select
                className="cmx-field"
                value={d.type}
                onChange={e =>
                  set({
                    discounts: s.discounts.map(x =>
                      x.id === d.id ? { ...x, type: e.target.value as CentreDiscount['type'], value: 0 } : x
                    ),
                  })
                }
              >
                <option value="percentage">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
                <option value="free_sessions">Free sessions</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="flex flex-col gap-1">
              <span className="cmx-field-label">
                Value{d.type === 'percentage' ? ' (%)' : d.type === 'fixed' ? ' ($)' : ' (sessions)'}
              </span>
              <input
                className="cmx-field"
                max={d.type === 'percentage' ? 100 : d.type === 'free_sessions' ? 30 : 99999}
                min={0}
                type="number"
                value={d.value}
                onChange={e => {
                  const maxV = d.type === 'percentage' ? 100 : d.type === 'free_sessions' ? 30 : 99999;
                  const v = Math.max(0, Math.min(maxV, Number(e.target.value) || 0));
                  set({
                    discounts: s.discounts.map(x => (x.id === d.id ? { ...x, value: v } : x)),
                  });
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="cmx-field-label">Applies To</span>
              <input
                className="cmx-field"
                type="text"
                value={d.appliesTo}
                onChange={e =>
                  set({
                    discounts: s.discounts.map(x => (x.id === d.id ? { ...x, appliesTo: e.target.value } : x)),
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="cmx-field-label">Promo Code</span>
              <input
                className="cmx-field"
                placeholder="OPTIONAL"
                type="text"
                value={d.promoCode}
                onChange={e =>
                  set({
                    discounts: s.discounts.map(x =>
                      x.id === d.id ? { ...x, promoCode: e.target.value.toUpperCase() } : x
                    ),
                  })
                }
              />
            </div>
          </div>
        </div>
      ))}
    </div>
    <button
      style={{
        width: '100%',
        padding: 10,
        border: '2px dashed var(--border)',
        borderRadius: 10,
        background: '#fff',
        cursor: 'pointer',
        fontSize: 13,
        color: 'var(--sub)',
        fontWeight: 500,
      }}
      type="button"
      onClick={addDiscount}
    >
      + Add Discount
    </button>

    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
      <button className="cmx-btn cmx-btn-outline" type="button" onClick={() => goStep(3)}>
        ← Back
      </button>
      <button className="cmx-btn cmx-btn-navy" type="button" onClick={() => goStep(5)}>
        Next: Review →
      </button>
    </div>
  </div>
);

export default Step4Plans;
