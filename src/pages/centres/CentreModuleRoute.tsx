import React, { useEffect, useRef } from 'react';

import { toast } from 'react-hot-toast';
import { Navigate, useParams } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { useCentreNav } from '../../contexts/CentreNavContext';
import { canRead, RestrictedAccess } from '../../rbac';

import { ACTIVE_ONLY_MODULE_KEYS, LIVE_CENTRE_MODULES } from './centreModules';
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

  // A Draft/Staging/Suspended centre can't be operated on — Operations modules
  // (bookings, tickets, maintenance, etc.) are blocked here even if someone reaches
  // the URL directly (hiding the nav link alone isn't enough); Centre Config
  // (Facilities, Plans & Pricing) stays open so the centre can actually be set up.
  const needsActivation =
    !!mod && ACTIVE_ONLY_MODULE_KEYS.has(mod.key) && !!activeCentre && activeCentre.status !== 'active';
  // Toasting is a side effect, so it belongs in an effect, not inline during render
  // (which could double-fire under StrictMode or re-render before navigating away).
  const toastedRef = useRef(false);
  useEffect(() => {
    if (needsActivation && !toastedRef.current) {
      toastedRef.current = true;
      toast.error("This centre isn't live yet — finish setup (Facilities / Plans & Pricing) first.");
    }
    if (!needsActivation) toastedRef.current = false;
  }, [needsActivation]);

  if (!mod?.component) return <Navigate replace to={ROUTES.CENTRES.path} />;

  if (needsActivation) {
    // Land on the first Centre Config module this user can access instead of
    // bouncing all the way back out to the centre list.
    const firstSetup = LIVE_CENTRE_MODULES.find(m => !ACTIVE_ONLY_MODULE_KEYS.has(m.key) && canRead(m.scope));
    if (firstSetup) return <Navigate replace to={`/centres/${facilityCode}/${firstSetup.slug}`} />;
    return <Navigate replace to={ROUTES.CENTRES.path} />;
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
