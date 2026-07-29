import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { getCentreDetails } from '../../../store/centres/api';
import { AppDispatch, RootState } from '../../../store/store';
import { centreColour, countryFlag } from '../constants';
import NewCentreWizard from '../newCentre/NewCentreWizard';

import type { CentreApiStatus } from '../../../store/centres/types';

const PILL_BASE = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold';

const STATUS_PILL: Record<CentreApiStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'bg-cmx-green-bg text-cmx-green' },
  draft: { label: 'Draft', tone: 'bg-cmx-amber-bg text-cmx-amber' },
  suspended: { label: 'Suspended', tone: 'bg-red-100 text-red-600' },
};

interface Props {
  code: string;
  /** The module page to render under the centre header (Members, Slot Bookings, …). */
  children: React.ReactNode;
}

const CentreDetailView: React.FC<Props> = ({ code, children }) => {
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
      </div>

      {/* This centre-config bundle (lanes, memberships, facility settings) only feeds the
          header above and the edit/activate wizard — it is NOT required to view an
          operational module (Members, Slot Bookings, …), which is already correctly
          permission-gated by CentreModuleRoute on its own scope. Previously the module
          page only rendered once this unrelated bundle finished loading, so any role
          that could read a module but not the full admin config (e.g. a facility-scoped
          coach/staff) saw a permanently blank page while this call loaded or errored —
          the module's own data never even got a chance to fetch. Render it unconditionally. */}
      {isLoading && !bundle && (
        <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 12 }}>Loading centre details…</div>
      )}

      {!isLoading && error && !bundle && (
        <div
          style={{
            fontSize: 13,
            color: '#92400e',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* The active module's page (Members, Slot Bookings, …) rendered under the centre
          header. It scopes itself to this centre via facilityScope. Navigation lives in
          the global Sidebar. */}
      {children}
    </div>
  );
};

export default CentreDetailView;
