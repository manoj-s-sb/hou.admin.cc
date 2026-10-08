import { useEffect, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import NumberInput from '../../../components/NumberInput';
import { updateCentreFacilities } from '../../../store/centres/api';
import { AppDispatch } from '../../../store/store';

import { featureMetaFor } from './productMeta';

import type { ApiProduct } from '../../../store/centres/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'commingsoon', label: 'Coming Soon' },
  { value: 'inactive', label: 'Inactive' },
];

/** "Podcast Room" -> "podcastroom" — same slug shape _build_product_doc stores
 * (backend lower-cases it anyway; done here too so the collision check below
 * compares like-for-like before submitting). */
const slugify = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// Same field style as the New Centre wizard's Additional Facilities step
// (AdditionalFacilitiesStep.tsx's FF_INPUT) — this modal is the same facility
// config, just reached from the Facilities page instead of the wizard, so it
// should look like the same screen.
const FF_INPUT =
  'w-full rounded-[7px] border border-cmx-border bg-white px-2.5 py-2 text-[13px] text-cmx-text outline-none focus:border-cmx-blue focus:shadow-[0_0_0_2px_rgba(37,99,235,0.1)] disabled:bg-gray-50 disabled:text-muted';
const FIELD_LABEL = 'text-[11px] font-semibold uppercase tracking-[0.04em] text-sub';

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--sub)',
      textTransform: 'uppercase',
      letterSpacing: '.05em',
      margin: '4px 0 10px',
    }}
  >
    {children}
  </div>
);

interface Props {
  centreCode: string;
  /** null = Add New; otherwise editing this existing product. */
  product: ApiProduct | null;
  /** Every other product's code at this centre — blocks an Add New that would
   * collide (the backend's `products` is create-only, so a collision would
   * otherwise silently no-op instead of saving). */
  existingCodes: string[];
  onClose: () => void;
  /** Called after a successful save so the page refetches the live bundle. */
  onSaved: () => void;
}

const FacilityProductModal: React.FC<Props> = ({ centreCode, product, existingCodes, onClose, onSaved }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isEdit = !!product;

  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [price, setPrice] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(60);
  const [slotCapacity, setSlotCapacity] = useState<number | null>(1);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number | null>(null);
  const [advanceBookingDays, setAdvanceBookingDays] = useState<number | null>(null);
  const [maxGuestsPerSlot, setMaxGuestsPerSlot] = useState<number | null>(null);
  const [additionalGuestPrice, setAdditionalGuestPrice] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(product?.name ?? '');
    setStatus(product?.status || 'active');
    setPrice(product?.slotPricing?.default?.price ?? null);
    setDurationMinutes(product?.sessionRules?.durationMinutes ?? 60);
    setSlotCapacity(product?.sessionRules?.slotCapacity ?? 1);
    setMaxBookingsPerDay(product?.sessionRules?.maxBookingsPerDay ?? null);
    setAdvanceBookingDays(product?.sessionRules?.advanceBookingDays ?? null);
    setMaxGuestsPerSlot(product?.guestPolicy?.maxGuestsPerSlot ?? null);
    setAdditionalGuestPrice(product?.guestPolicy?.additionalGuestPrice ?? null);
  }, [product]);

  const newCode = isEdit ? '' : slugify(name);
  const codeCollision = !isEdit && !!newCode && existingCodes.includes(newCode);
  const canSubmit = name.trim().length > 0 && !codeCollision && (isEdit || newCode.length > 0);
  const meta = featureMetaFor(isEdit ? (product?.code ?? '') : newCode || 'custom');

  const handleSubmit = async () => {
    if (!canSubmit || isSaving) return;
    setIsSaving(true);
    try {
      if (isEdit && product) {
        await dispatch(
          updateCentreFacilities({
            centreId: centreCode,
            productUpdates: [
              {
                code: product.code,
                name: name.trim(),
                status,
                price: price ?? 0,
                durationMinutes: durationMinutes ?? 60,
                slotCapacity: slotCapacity ?? 1,
                maxBookingsPerDay: maxBookingsPerDay ?? undefined,
                advanceBookingDays: advanceBookingDays ?? undefined,
                maxGuestsPerSlot: maxGuestsPerSlot ?? undefined,
                additionalGuestPrice: additionalGuestPrice ?? undefined,
              },
            ],
          })
        ).unwrap();
        toast.success(`"${name.trim()}" updated.`);
      } else {
        await dispatch(
          updateCentreFacilities({
            centreId: centreCode,
            products: [
              {
                type: 'product',
                code: newCode,
                name: name.trim(),
                status,
                slotPricing: { default: { price: price ?? 0, currency: 'usd' } },
                sessionRules: {
                  durationMinutes: durationMinutes ?? 60,
                  slotCapacity: slotCapacity ?? 1,
                  maxBookingsPerDay: maxBookingsPerDay ?? undefined,
                  advanceBookingDays: advanceBookingDays ?? undefined,
                },
                guestPolicy: {
                  maxGuestsPerSlot: maxGuestsPerSlot ?? undefined,
                  additionalGuestPrice: additionalGuestPrice ?? undefined,
                },
              },
            ],
          })
        ).unwrap();
        toast.success(`"${name.trim()}" added.`);
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error((error as string) || 'Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="button"
      tabIndex={0}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        role="dialog"
        style={{
          background: '#fff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 6px 20px rgba(16,24,40,.12)',
        }}
      >
        {/* Header — same icon-circle + title layout as the wizard's facility panels */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid var(--border)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: meta.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {meta.icon}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
            {isEdit ? `Edit ${product?.name || 'Facility'}` : 'Add Bookable Facility'}
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <label className="flex flex-col gap-1" style={{ marginBottom: 12 }}>
            <span className={FIELD_LABEL}>Facility name *</span>
            <input className={FF_INPUT} type="text" value={name} onChange={e => setName(e.target.value)} />
            {codeCollision && (
              <span style={{ fontSize: 11, color: '#dc2626' }}>
                A facility with this name already exists — choose a different name.
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1" style={{ marginBottom: 12 }}>
            <span className={FIELD_LABEL}>Status</span>
            <select className={FF_INPUT} value={status} onChange={e => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <SectionLabel>Pricing</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Price per slot ($)</span>
              <NumberInput className={FF_INPUT} min={0} step={0.01} value={price} onValueChange={setPrice} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Extra guest price ($)</span>
              <NumberInput
                className={FF_INPUT}
                min={0}
                step={0.01}
                value={additionalGuestPrice}
                onValueChange={setAdditionalGuestPrice}
              />
            </label>
          </div>

          <SectionLabel>Capacity &amp; Access</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Session duration (min)</span>
              <NumberInput className={FF_INPUT} min={5} value={durationMinutes} onValueChange={setDurationMinutes} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Capacity per slot</span>
              <NumberInput className={FF_INPUT} min={1} value={slotCapacity} onValueChange={setSlotCapacity} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Max guests / slot</span>
              <NumberInput className={FF_INPUT} min={0} value={maxGuestsPerSlot} onValueChange={setMaxGuestsPerSlot} />
            </label>
          </div>

          <SectionLabel>Booking Rules</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Max bookings / day</span>
              <NumberInput
                className={FF_INPUT}
                min={0}
                value={maxBookingsPerDay}
                onValueChange={setMaxBookingsPerDay}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>Advance booking (days)</span>
              <NumberInput
                className={FF_INPUT}
                min={0}
                value={advanceBookingDays}
                onValueChange={setAdvanceBookingDays}
              />
            </label>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            borderTop: '1px solid var(--border)',
            padding: '14px 20px',
          }}
        >
          <button className="cmx-btn cmx-btn-outline" disabled={isSaving} type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="cmx-btn cmx-btn-navy"
            disabled={!canSubmit || isSaving}
            type="button"
            onClick={handleSubmit}
          >
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Facility'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacilityProductModal;
