import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { useCentreNav } from '../../../contexts/CentreNavContext';
import { getCentreDetails } from '../../../store/centres/api';
import { AppDispatch, RootState } from '../../../store/store';
import { centreColour, countryFlag } from '../constants';
import NewCentreWizard from '../newCentre/NewCentreWizard';

import AutoFields from './AutoFields';
import BookingsTab from './BookingsTab';
import MembersTab from './MembersTab';

import type { ApiLane, CentreApiStatus } from '../../../store/centres/types';

const PILL_BASE = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold';

const STATUS_PILL: Record<CentreApiStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'bg-cmx-green-bg text-cmx-green' },
  draft: { label: 'Draft', tone: 'bg-cmx-amber-bg text-cmx-amber' },
  suspended: { label: 'Suspended', tone: 'bg-red-100 text-red-600' },
};

const GRID: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 };

const money = (v: unknown): string => (v === null || v === undefined || v === '' ? '—' : `$${v}`);

interface Props {
  code: string;
}

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.04em',
        color: 'var(--sub)',
      }}
    >
      {label}
    </span>
    <span style={{ fontSize: 13, color: 'var(--text)' }}>{value || '—'}</span>
  </div>
);

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div
    className="overflow-x-auto rounded-[10px] border border-cmx-border bg-white"
    style={{ marginBottom: 16, padding: 16 }}
  >
    <div className="flex items-center gap-2 text-sm font-bold text-navy" style={{ marginBottom: 12 }}>
      <span className="h-[7px] w-[7px] rounded-full bg-cmx-blue" />
      {title}
    </div>
    {children}
  </div>
);

// Centre-scoped ops modules whose data feed isn't wired to the new doc-bundle
// backend yet. Renders a clear, centre-scoped placeholder so the navigation works
// end-to-end without showing fabricated data.
const OPS_MODULE_COPY: Record<string, { title: string; desc: string }> = {
  induction: { title: 'Induction', desc: 'Schedule and track member induction sessions for this centre.' },
  tours: { title: 'Tour List', desc: 'Manage tour bookings and scheduling for this centre.' },
  waitlist: { title: 'Waitlist / Leads', desc: 'Prospective members and waitlisted leads for this centre.' },
  tailgate: {
    title: 'Tailgate Logs',
    desc: 'Video logs, unidentified entries and violation tracking for this centre.',
  },
  maintenance: { title: 'Maintenance Tasks', desc: 'Lane and equipment maintenance tracking for this centre.' },
  tickets: { title: 'Tickets / Incidents', desc: 'Support tickets and incident reports raised for this centre.' },
};

const OpsModulePlaceholder: React.FC<{ module: string; centreName?: string }> = ({ module, centreName }) => {
  const copy = OPS_MODULE_COPY[module];
  if (!copy) return null;
  return (
    <div className="rounded-xl border border-cmx-border bg-white px-6 py-14 text-center text-sub">
      <div className="text-sm font-bold text-navy">{copy.title}</div>
      <div style={{ marginTop: 6, color: 'var(--sub)' }}>{copy.desc}</div>
      {centreName && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--sub)' }}>Centre: {centreName}</div>}
      <div
        style={{ marginTop: 14, fontSize: 11, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.05em' }}
      >
        Coming soon
      </div>
    </div>
  );
};

const CentreDetailView: React.FC<Props> = ({ code }) => {
  const { module } = useCentreNav();
  const dispatch = useDispatch<AppDispatch>();
  const {
    details: bundle,
    detailsLoading: isLoading,
    detailsError: error,
  } = useSelector((state: RootState) => state.centres);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    dispatch(getCentreDetails(code));
  }, [dispatch, code]);

  // ── Edit / activate: open the wizard pre-filled from the loaded bundle ──
  if (editing && bundle) {
    return (
      <NewCentreWizard
        initialBundle={bundle}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          dispatch(getCentreDetails(code)); // pull fresh status/config back into the detail view
        }}
      />
    );
  }

  const facility = bundle?.facility;
  const status = facility ? STATUS_PILL[facility.status as CentreApiStatus] : undefined;
  // Legacy ops endpoints key on the centre id (fall back to code before details land).
  const centreId = facility?.id ?? code;

  return (
    <div className="font-sans text-sm text-cmx-text">
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16, alignItems: 'center' }}>
        <div
          className="mb-1 text-xl font-bold text-navy"
          style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
        >
          {facility && <span style={{ width: 6, height: 26, borderRadius: 3, background: centreColour(code) }} />}
          {facility ? `${countryFlag(facility.countryCode)} ${facility.name}` : code}
          {facility && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sub)' }}>· {facility.code}</span>}
          {status && <span className={`${PILL_BASE} ${status.tone}`}>{status.label}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] bg-navy px-3 py-1.5 text-[12.5px] font-semibold text-white transition-all hover:opacity-90"
            disabled={!bundle}
            type="button"
            onClick={() => setEditing(true)}
          >
            {facility?.status === 'draft' ? 'Edit & Activate' : 'Edit'}
          </button>
          <button
            disabled
            className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold transition-all"
            title="Coming soon (legacy model)"
            type="button"
          >
            Suspend
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-cmx-border bg-white px-6 py-14 text-center text-sub">
          <div className="text-sm font-bold text-navy">Loading centre…</div>
        </div>
      )}

      {!isLoading && error && (
        <div
          style={{
            fontSize: 13,
            color: '#92400e',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '12px 14px',
          }}
        >
          {error}
        </div>
      )}

      {!isLoading && !error && bundle && (
        <>
          {/* ── Operations: Members ── */}
          {module === 'members' && <MembersTab centre={{ id: centreId }} />}

          {/* ── Operations: Slot Bookings ── */}
          {module === 'bookings' && <BookingsTab centre={{ id: centreId }} />}

          {/* ── Operations: Induction / Tours / Waitlist / Tailgate / Maintenance / Tickets ── */}
          {module === 'induction' && <OpsModulePlaceholder centreName={facility?.name} module="induction" />}
          {module === 'tours' && <OpsModulePlaceholder centreName={facility?.name} module="tours" />}
          {module === 'waitlist' && <OpsModulePlaceholder centreName={facility?.name} module="waitlist" />}
          {module === 'tailgate' && <OpsModulePlaceholder centreName={facility?.name} module="tailgate" />}
          {module === 'maintenance' && <OpsModulePlaceholder centreName={facility?.name} module="maintenance" />}
          {module === 'tickets' && <OpsModulePlaceholder centreName={facility?.name} module="tickets" />}

          {/* ── Centre Config: Facility ── */}
          {module === 'facility' && facility && (
            <>
              <Card title="Identity">
                <div style={GRID}>
                  <Field label="Name" value={facility.name} />
                  <Field label="Code" value={facility.code} />
                  <Field label="Status" value={facility.status} />
                  <Field label="Timezone" value={facility.timezone} />
                  <Field label="City" value={facility.cityCode} />
                  <Field label="Country" value={facility.countryCode} />
                  <Field label="State" value={facility.stateCode} />
                  <Field label="Free Slots" value={facility.freeSolts} />
                  <Field
                    label="Coordinates"
                    value={
                      facility.latitude || facility.longitude ? `${facility.latitude}, ${facility.longitude}` : '—'
                    }
                  />
                  <Field label="Created" value={facility.createdAt} />
                  <Field label="Updated" value={facility.updatedAt} />
                </div>
              </Card>

              <Card title="Address">
                <div style={GRID}>
                  <Field label="Street" value={facility.address?.street} />
                  <Field label="Suburb" value={facility.address?.suburb} />
                  <Field label="City" value={facility.address?.city} />
                  <Field label="State" value={facility.address?.state} />
                  <Field label="Postcode" value={facility.address?.postcode} />
                  <Field label="Country" value={facility.address?.country} />
                </div>
              </Card>

              <Card title="Contact">
                <div style={GRID}>
                  <Field label="Email" value={facility.contact?.email} />
                  {(facility.contact?.phones ?? []).map((p, i) => (
                    <Field key={i} label={`Phone (${p.type})`} value={p.phone} />
                  ))}
                </div>
              </Card>

              <Card title="Operating Hours">
                <div style={GRID}>
                  {facility.operatingHours &&
                    Object.entries(facility.operatingHours).map(([day, ranges]) => (
                      <Field
                        key={day}
                        label={day.charAt(0).toUpperCase() + day.slice(1)}
                        value={ranges.length ? ranges.join(', ') : 'Closed'}
                      />
                    ))}
                </div>
              </Card>

              {(facility.holidays?.length ?? 0) > 0 && (
                <Card title="Holidays">
                  <div style={GRID}>
                    {facility.holidays.map((h, i) => (
                      <Field key={i} label={h.date} value={h.name} />
                    ))}
                  </div>
                </Card>
              )}

              {/* Everything else the backend returns for this facility (security,
                  features, waitlist, edge device, induction, tour, slot config…). */}
              <Card title="Additional Configuration">
                <AutoFields
                  data={facility as unknown as Record<string, unknown>}
                  omit={[
                    'code',
                    'name',
                    'cityCode',
                    'countryCode',
                    'stateCode',
                    'timezone',
                    'status',
                    'latitude',
                    'longitude',
                    'freeSolts',
                    'address',
                    'contact',
                    'operatingHours',
                    'holidays',
                    'createdAt',
                    'updatedAt',
                  ]}
                />
              </Card>
            </>
          )}

          {/* ── Centre Config: Lanes ── */}
          {module === 'lanes' && (
            <div className="overflow-x-auto rounded-[10px] border border-cmx-border bg-white">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                      Lane
                    </th>
                    <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                      Type
                    </th>
                    <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                      Code
                    </th>
                    <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                      Status
                    </th>
                    <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                      Pitch Lengths
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.lanes.length === 0 && (
                    <tr>
                      <td
                        className="border-b border-gray-100 px-3.5 py-[11px] align-middle"
                        colSpan={5}
                        style={{ textAlign: 'center', color: 'var(--sub)', padding: 24 }}
                      >
                        No lanes configured.
                      </td>
                    </tr>
                  )}
                  {bundle.lanes.map((lane: ApiLane, i) => (
                    <tr key={lane.id ?? `${lane.code}-${i}`}>
                      <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">#{lane.laneNo}</td>
                      <td
                        className="border-b border-gray-100 px-3.5 py-[11px] align-middle"
                        style={{ textTransform: 'capitalize' }}
                      >
                        {lane.laneType}
                      </td>
                      <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">{lane.code}</td>
                      <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-sub">
                          {lane.status}
                        </span>
                      </td>
                      <td
                        className="border-b border-gray-100 px-3.5 py-[11px] align-middle"
                        style={{ color: 'var(--sub)' }}
                      >
                        {Object.keys(lane.lanePitchMapping ?? {}).length || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Centre Config: Plans & Pricing ── */}
          {module === 'plans' && (
            <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
              {bundle.memberships.length === 0 && (
                <div style={{ color: 'var(--sub)', fontSize: 13 }}>No membership plans configured.</div>
              )}
              {bundle.memberships.map((m, i) => {
                const reg = (m.pricing?.regular ?? {}) as Record<string, unknown>;
                const cycles = m.pricing?.billingCycles ?? [];
                return (
                  <div
                    key={m.id ?? `${m.code}-${i}`}
                    className="overflow-x-auto rounded-[10px] border border-cmx-border bg-white"
                    style={{ padding: 16 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{m.name}</span>
                      {m.isPopular && (
                        <span className="inline-flex items-center rounded-full bg-cmx-green-bg px-2 py-0.5 text-[11px] font-semibold text-cmx-green">
                          Popular
                        </span>
                      )}
                    </div>
                    {m.description && (
                      <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 10 }}>{m.description}</div>
                    )}
                    <div style={GRID}>
                      <Field label="Code" value={m.code} />
                      <Field label="Registration Fee" value={money(m.registrationFee)} />
                      <Field label="Billing Cycles" value={cycles.length ? cycles.join(', ') : '—'} />
                      <Field label="Fortnightly" value={money(reg.fortnightly)} />
                      <Field label="Annual" value={money(reg.annual)} />
                      <Field label="Monthly" value={money(reg.monthly)} />
                    </div>
                    {(m.benefits?.length ?? 0) > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '.04em',
                            color: 'var(--sub)',
                            marginBottom: 6,
                          }}
                        >
                          Benefits
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {m.benefits.map((b, bi) => (
                            <span
                              key={bi}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-sub"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Everything else on this plan (access, booking rules, policies, stripe…). */}
                    <details style={{ marginTop: 12 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>
                        Full configuration
                      </summary>
                      <div style={{ marginTop: 10 }}>
                        <AutoFields
                          data={m as unknown as Record<string, unknown>}
                          omit={['code', 'name', 'isPopular', 'description', 'registrationFee', 'benefits', 'pricing']}
                        />
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Centre Config: Sales Flow ── */}
          {module === 'salesflow' && (
            <Card title="Membership Sales Flow">
              <div style={GRID}>
                <Field label="Total Capacity" value={bundle.membershipSalesFlow?.capacity?.total} />
                <Field label="Centre Page URL" value={bundle.membershipSalesFlow?.centrePageUrl} />
                <Field label="Checkout URL Template" value={bundle.membershipSalesFlow?.checkoutUrlTemplate} />
              </div>
              {bundle.membershipSalesFlow?.capacity?.plans && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      color: 'var(--sub)',
                      marginBottom: 6,
                    }}
                  >
                    Per-plan allocation
                  </div>
                  <div style={GRID}>
                    {Object.entries(bundle.membershipSalesFlow.capacity.plans).map(([plan, slots]) => (
                      <Field key={plan} label={plan} value={`${slots} slots`} />
                    ))}
                  </div>
                </div>
              )}

              {/* Phases, foundation handling, admin controls, redirect logic… */}
              {bundle.membershipSalesFlow && (
                <div style={{ marginTop: 16 }}>
                  <AutoFields
                    data={bundle.membershipSalesFlow as unknown as Record<string, unknown>}
                    omit={['capacity', 'centrePageUrl', 'checkoutUrlTemplate']}
                  />
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default CentreDetailView;
