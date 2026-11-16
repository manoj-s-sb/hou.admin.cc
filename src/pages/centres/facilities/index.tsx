import React, { useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { getCentreDetails } from '../../../store/centres/api';
import { AppDispatch, RootState } from '../../../store/store';
import { has } from '../../../utils/format';
import { DEFAULT_AMENITIES } from '../constants';

import AmenitiesEditModal from './AmenitiesEditModal';
import FacilityProductModal from './FacilityProductModal';
import { featureMetaFor } from './productMeta';

import type { ApiProduct } from '../../../store/centres/types';

/** Products already surfaced via the Lanes section — skip them here to avoid double-listing. */
const LANE_PRODUCT_CODES = new Set(['batting', 'bowling', 'hybrid', 'multipurpose']);

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active: { label: 'Active', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  commingsoon: { label: 'Coming Soon', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  inactive: { label: 'Inactive', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
  draft: { label: 'Draft', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
};
const statusMetaFor = (status: string): { label: string; color: string; bg: string; border: string } =>
  STATUS_META[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' };

const LANE_META = [
  { key: 'batting', label: 'Batting Lanes', icon: '🏏', color: '#21295A' },
  { key: 'bowling', label: 'Bowling Lanes', icon: '🎳', color: '#008482' },
  // Real lane documents store this as "hybrid" (see slots module's laneType), not
  // "multipurpose" — the New Centre wizard used a different value than the rest of
  // the app actually writes/expects, so real hybrid lanes were undercounted here.
  { key: 'hybrid', label: 'Hybrid Lanes', icon: '🔄', color: '#d97706' },
];

const money = (amount?: number, currency?: string): string => {
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
    }).format(amount as number);
  } catch {
    return `$${(amount as number).toFixed(2)}`;
  }
};

/** "HH:MM"–"HH:MM" (24h) → a readable range, e.g. "5:00 AM – 10:00 PM" — or
 * "24 Hours" for the all-day sentinel FacilityProductModal's 24-hour toggle writes. */
const formatHoursRange = (open?: string, close?: string): string | null => {
  if (!open || !close) return null;
  if (open === '00:00' && close === '23:59') return '24 Hours';
  const fmt = (t: string) => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mStr ?? '00'} ${period}`;
  };
  return `${fmt(open)} – ${fmt(close)}`;
};

/** True when a value is set (not null/undefined) — so a legit 0 still renders
 * rather than being mistaken for "unset". */
const val = (ok: boolean, text: string): string => (ok ? text : '—');

/** Build the label/value rows for one product — always the SAME fixed field
 * list, in the same order, for every card of a given booking model, with "—"
 * for anything that specific product hasn't set. Previously a row was simply
 * omitted when its backing field was unset, so two cards of the same type
 * (e.g. two pay-per-slot rooms) could show a different NUMBER of fields
 * depending on what happened to be filled in — Podcast showing "Price per
 * hour" while Meeting Room, missing that one field, showed no price line at
 * all instead of "Price per hour: —".
 *
 * The Gym is a membership add-on (bookingModel="membership_addon"), billed
 * with the member's plan rather than paid per slot — it gets its own fixed
 * field list since "Price per hour" has no meaning for it; every OTHER
 * product (Podcast, Meeting Room, Yoga Room, Gaming, Custom, …) shares the
 * one pay-per-slot list below. */
const detailRows = (p: ApiProduct): [string, string][] => {
  const hours = formatHoursRange(p.openTime, p.closeTime);

  if (p.bookingModel === 'membership_addon') {
    const gymPricing = p.pricing as { individual?: { fortnightly?: number } } | undefined;
    const fortnightly = gymPricing?.individual?.fortnightly;
    const guestPrice = p.guestPolicy?.additionalGuestPrice;
    return [
      ['Fortnightly price', val(has(fortnightly), money(fortnightly))],
      ['Max members / slot', val(has(p.sessionRules?.slotCapacity), `${p.sessionRules?.slotCapacity}`)],
      ['Session duration', val(has(p.sessionRules?.durationMinutes), `${p.sessionRules?.durationMinutes} min`)],
      [
        'Free trial slots',
        val(has(p.freeTrial?.slotsPerMembershipLifetime), `${p.freeTrial?.slotsPerMembershipLifetime}`),
      ],
      ['Minimum age', val(has(p.ageRules?.minAge), `${p.ageRules?.minAge}`)],
      ['Annual discount', val(has(p.annualDiscountPct) && Number(p.annualDiscountPct) > 0, `${p.annualDiscountPct}%`)],
      ['Total capacity', val(has(p.totalCapacity), `${p.totalCapacity} members`)],
      ['Max concurrent', val(has(p.concurrentCapacity), `${p.concurrentCapacity} users at a time`)],
      ['Guest price', val(has(guestPrice) && Number(guestPrice) > 0, money(guestPrice))],
      [
        'Free guest visits',
        val(has(p.guestPolicy?.freeGuestsPerBillingCycle), `${p.guestPolicy?.freeGuestsPerBillingCycle} / month`),
      ],
      ['Operating hours', hours ?? '—'],
    ];
  }

  const pricing = p.pricing as { perHour?: number; currency?: string } | undefined;
  const extraGuestPrice = p.guestPolicy?.additionalGuestPrice;
  return [
    ['Price per hour', val(has(pricing?.perHour), money(pricing?.perHour, pricing?.currency))],
    [
      'Booking length',
      val(
        has(p.sessionRules?.minHours) && has(p.sessionRules?.maxHours),
        `${p.sessionRules?.minHours}–${p.sessionRules?.maxHours} hrs`
      ),
    ],
    ['Capacity per slot', val(has(p.sessionRules?.slotCapacity), `${p.sessionRules?.slotCapacity}`)],
    ['Max bookings / day', val(has(p.sessionRules?.maxBookingsPerDay), `${p.sessionRules?.maxBookingsPerDay}`)],
    ['Advance booking', val(has(p.sessionRules?.advanceBookingDays), `${p.sessionRules?.advanceBookingDays} days`)],
    ['Max guests / slot', val(has(p.guestPolicy?.maxGuestsPerSlot), `${p.guestPolicy?.maxGuestsPerSlot}`)],
    ['Extra guest price', val(has(extraGuestPrice) && Number(extraGuestPrice) > 0, money(extraGuestPrice))],
    ['Total capacity', val(has(p.totalCapacity), `${p.totalCapacity} people`)],
    ['Max concurrent', val(has(p.concurrentCapacity), `${p.concurrentCapacity} people at a time`)],
    ['Free guest visits', val(has(p.freeGuestVisits), `${p.freeGuestVisits} / month`)],
    ['Operating hours', hours ?? '—'],
  ];
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
  const dispatch = useDispatch<AppDispatch>();
  const bundle = useSelector((s: RootState) => s.centres.details);
  const lanes = bundle?.lanes ?? [];
  const laneCount = (type: string): number => lanes.filter(l => l.laneType === type).length;
  const centreCode = bundle?.facility?.code ?? '';

  // Amenities come from the centre's saved "Facilities Available" selection; the
  // default list is only a fallback for centres created before it was persisted.
  const amenities = bundle?.facility?.amenities?.length ? bundle.facility.amenities : DEFAULT_AMENITIES;

  // Bookable facility products (podcast room, meeting room, gym, ...) — real `type: "product"`
  // docs linked to this centre via facilityCode, returned alongside facility/lanes/memberships.
  const products = (bundle?.products ?? []).filter(p => !LANE_PRODUCT_CODES.has((p.code ?? '').toLowerCase()));

  const [editingAmenities, setEditingAmenities] = useState(false);
  // Product modal: closed when null; { product: null } to add a new one,
  // { product: <existing> } to edit it.
  const [productModal, setProductModal] = useState<{ product: ApiProduct | null } | null>(null);

  // Re-pulls the live bundle after a save so every section (amenities, the
  // product just added/edited) reflects the DB immediately, not stale redux state.
  const refreshBundle = () => {
    if (centreCode) dispatch(getCentreDetails(centreCode));
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>Facilities</div>
        <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>
          Primary lanes, general amenities and additional bookable spaces at this centre
        </div>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ ...sectionLabel, marginBottom: 0 }}>General Amenities</div>
        <button
          className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] border border-cmx-border bg-white px-3 py-1.5 text-[12.5px] font-semibold text-sub transition-all hover:bg-gray-50"
          disabled={!centreCode}
          type="button"
          onClick={() => setEditingAmenities(true)}
        >
          <svg fill="none" height={13} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={13}>
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Amenities
        </button>
      </div>
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

      {/* Additional bookable facilities */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ ...sectionLabel, marginBottom: 0 }}>Additional Bookable Facilities</div>
        <button
          className="cmx-btn cmx-btn-outline"
          disabled={!centreCode}
          type="button"
          onClick={() => setProductModal({ product: null })}
        >
          + Add New
        </button>
      </div>
      {products.length === 0 ? (
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
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {products.map(p => {
            const meta = featureMetaFor(p.code ?? '');
            const status = statusMetaFor(p.status);
            const rows = detailRows(p);
            return (
              <div
                key={p.id ?? p.code}
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{p.name || meta.label}</div>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: 3,
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: status.color,
                        background: status.bg,
                        border: `1px solid ${status.border}`,
                        borderRadius: 20,
                        padding: '1px 8px',
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <button
                    className="shrink-0 cursor-pointer self-start rounded-full border border-cmx-border bg-white px-3.5 py-1.5 text-[12px] font-semibold text-sub transition-all hover:bg-gray-50"
                    type="button"
                    onClick={() => setProductModal({ product: p })}
                  >
                    Edit
                  </button>
                </div>
                {rows.length > 0 &&
                  Array.from({ length: Math.ceil(rows.length / 2) }, (_, i) => rows.slice(i * 2, i * 2 + 2)).map(
                    (pair, i, pairs) => (
                      <div
                        key={pair[0][0]}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 20,
                          padding: '14px 16px',
                          borderBottom: i < pairs.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        {pair.map(([label, value], j) => (
                          <div
                            key={label}
                            style={
                              j === 0 && pair.length === 2
                                ? { paddingRight: 20, borderRight: '1px solid var(--border)' }
                                : undefined
                            }
                          >
                            <div style={{ fontSize: 11, color: 'var(--sub)' }}>{label}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginTop: 2 }}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
              </div>
            );
          })}
        </div>
      )}

      {editingAmenities && centreCode && (
        <AmenitiesEditModal
          centreCode={centreCode}
          current={amenities}
          onClose={() => setEditingAmenities(false)}
          onSaved={refreshBundle}
        />
      )}

      {productModal && centreCode && (
        <FacilityProductModal
          centreCode={centreCode}
          existingCodes={products.map(p => (p.code ?? '').toLowerCase())}
          plans={bundle?.memberships ?? []}
          product={productModal.product}
          onClose={() => setProductModal(null)}
          onSaved={refreshBundle}
        />
      )}
    </div>
  );
};

export default Facilities;
