/**
 * Builds a printable HTML summary of a centre's wizard configuration and opens
 * it in the browser's print dialog (where the user can "Save as PDF"). No PDF
 * dependency required — mirrors the Review step's content.
 */
import { COUNTRIES, DAYS, PLAN_CATALOGUE, TIMEZONES } from './constants';

import type { WizardState } from './types';

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const toNum = (v: number | string | ''): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

const row = (k: string, v: unknown): string =>
  `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v) || '—'}</td></tr>`;

export function downloadCentrePdf(s: WizardState): boolean {
  const capacity = toNum(s.overallCapacity);
  const foundation = toNum(s.foundationPool);
  const country = COUNTRIES.find(c => c.code === s.country)?.label || s.country;
  const tz = TIMEZONES.find(t => t.value === s.timezone)?.label || s.timezone;
  const address = [s.addressLine1, s.addressLine2, s.city, s.state, s.postcode].filter(Boolean).join(', ');
  const hours = s.is24x7
    ? 'Open 24/7'
    : s.operatingHours
        .map((h, i) => `${DAYS[i]}: ${h.isOpen ? `${h.openTime}–${h.closeTime}` : 'Closed'}`)
        .join('<br/>');

  const planRows = s.plans
    .filter(p => p.enabled)
    .map(p => {
      const meta = PLAN_CATALOGUE.find(m => m.id === p.planId);
      return `<tr>
        <td>${esc(meta?.name ?? p.planId)}</td>
        <td>$${esc(p.fortnightlyPrice)}</td>
        <td>$${esc(p.annualPrice)}</td>
        <td>${esc(p.allocatedSlots)}</td>
        <td>${p.isFoundationEligible ? 'Yes' : 'No'}</td>
      </tr>`;
    })
    .join('');

  const addlRows = s.additionalFacilities.length
    ? s.additionalFacilities
        .map(
          f =>
            `<li><strong>${esc(f.name)}</strong> — ${esc(
              f.type === 'gaming'
                ? `${f.psUnits ?? 0} units · $${f.chargePerHour ?? 0}/hr · ${f.openTime}–${f.closeTime}`
                : `$${f.fortnightlyPrice}/fn · ${f.slotDuration} · ${f.openTime}–${f.closeTime}`
            )}</li>`
        )
        .join('')
    : '<li>No additional facilities configured.</li>';

  const statusLabel = s.status === 'active' ? 'Active' : 'Draft';

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(s.name || 'Centre')} — Configuration</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 2px; color: #21295A; }
  .sub { color: #64748b; font-size: 13px; margin-bottom: 20px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: #21295A;
       border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin: 22px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  td, th { padding: 6px 8px; text-align: left; vertical-align: top; }
  td.k { color: #64748b; width: 34%; }
  td.v { color: #1e293b; font-weight: 500; }
  table.grid td { border-bottom: 1px solid #f1f5f9; }
  table.plans th { background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px;
                   text-transform: uppercase; color: #64748b; }
  table.plans td { border-bottom: 1px solid #f1f5f9; }
  ul { margin: 4px 0; padding-left: 18px; font-size: 12.5px; }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;
          background: ${s.status === 'active' ? '#d1fae5' : '#fef3c7'}; color: ${s.status === 'active' ? '#065f46' : '#92400e'}; }
  @media print { body { margin: 12px; } }
</style>
</head>
<body>
  <h1>${esc(s.name || 'Untitled Centre')} <span class="pill">${statusLabel}</span></h1>
  <div class="sub">${esc(s.shortCode)} · Centre configuration summary</div>

  <h2>Centre Details</h2>
  <table class="grid">
    ${row('Name', s.name)}
    ${row('Short Code', s.shortCode)}
    ${row('Status', statusLabel)}
    ${row('Address', address)}
    ${row('Country', country)}
    ${row('Timezone', tz)}
    ${row('Phone', s.phone)}
    ${row('Email', s.email)}
  </table>

  <h2>Operating Hours</h2>
  <table class="grid">${row('Hours', hours)}</table>

  <h2>Facilities & Capacity</h2>
  <table class="grid">
    ${row('Overall Capacity', capacity || '—')}
    ${row('Foundation Pool', foundation || '—')}
    ${row('Lanes', `${toNum(s.battingLanes)} batting · ${toNum(s.bowlingLanes)} bowling · ${toNum(s.multipurposeLanes)} multi`)}
    ${row('Slot Duration', `${s.slotDurationMinutes} min`)}
    ${row('Booking Window', `${s.advanceBookingWindowDays} days`)}
    ${row('Facilities', s.facilities.join(', '))}
  </table>

  <h2>Additional Bookable Facilities</h2>
  <ul>${addlRows}</ul>

  <h2>Membership Plans & Allocation</h2>
  <table class="plans">
    <thead><tr><th>Plan</th><th>Fortnightly</th><th>Annual</th><th>Slots</th><th>Foundation?</th></tr></thead>
    <tbody>${planRows || '<tr><td colspan="5">No plans enabled.</td></tr>'}</tbody>
  </table>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return false; // popup blocked — caller surfaces a toast
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Give the new document a tick to lay out before invoking print.
  win.setTimeout(() => win.print(), 250);
  return true;
}
