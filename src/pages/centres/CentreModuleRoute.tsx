import React from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { canRead, RestrictedAccess } from '../../rbac';

import { LIVE_CENTRE_MODULES } from './centreModules';
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

  const mod = LIVE_CENTRE_MODULES.find(m => m.slug === moduleSlug);
  if (!mod?.component) return <Navigate replace to={ROUTES.CENTRES.path} />;
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
