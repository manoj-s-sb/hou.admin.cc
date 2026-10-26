import React from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { useCentreNav } from '../../contexts/CentreNavContext';
import { canRead, RestrictedAccess } from '../../rbac';

import { isCentreOperational, LIVE_CENTRE_MODULES } from './centreModules';
import CentreDetailView from './components/CentreDetailView';
import { useCentreScope } from './useCentreScope';

/**
 * The ONE centre-scoped route: /centres/:facilityCode/:moduleSlug.
 *
 * Resolves :moduleSlug against the module registry — gates on the module's permission
 * scope and renders its page inside the centre shell. Adding a module needs no change
 * here: just add a registry entry (slug + component + scope). Unknown slugs bounce back
 * to the centre list.
 */
const CentreModuleRoute: React.FC = () => {
  const { facilityCode = '', moduleSlug = '' } = useParams<{ facilityCode: string; moduleSlug: string }>();
  useCentreScope(facilityCode);
  const { activeCentre } = useCentreNav();

  const mod = LIVE_CENTRE_MODULES.find(m => m.slug === moduleSlug);
  if (!mod?.component) return <Navigate replace to={ROUTES.CENTRES.path} />;

  // A Draft/Staging centre has never gone live — there's nothing real to
  // manage yet, so no module is reachable here (not even Facilities/Plans &
  // Pricing, even if someone reaches the URL directly). Setup happens only
  // through the Edit & Activate wizard from the centre list. A neutral note
  // instead of an error — this is the centre's normal, expected state before
  // it's activated, not a problem to flag.
  if (activeCentre && !isCentreOperational(activeCentre.status)) {
    return (
      <CentreDetailView code={facilityCode}>
        <div
          style={{
            fontSize: 13,
            color: '#374151',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '16px 18px',
          }}
        >
          This centre isn&apos;t active yet. Use <strong>Edit &amp; Activate</strong> from the centre list to finish
          setup and go live.
        </div>
      </CentreDetailView>
    );
  }

  if (!canRead(mod.scope)) {
    // Redirect to the first module this user can access instead of showing Restricted Access.
    const first = LIVE_CENTRE_MODULES.find(m => m.slug !== moduleSlug && canRead(m.scope));
    if (first) return <Navigate replace to={`/centres/${facilityCode}/${first.slug}`} />;
    return <RestrictedAccess />;
  }

  const Page = mod.component;
  return (
    <CentreDetailView code={facilityCode}>
      <Page />
    </CentreDetailView>
  );
};

export default CentreModuleRoute;
