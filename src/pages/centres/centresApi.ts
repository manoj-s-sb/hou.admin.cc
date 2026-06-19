/**
 * Centre Management — typed API client for the new doc-bundle endpoints.
 *
 * Thin wrappers over the shared axios instance (`src/services`) that unwrap the
 * standard `{ status, message, data, statusCode }` envelope and return `data`.
 * Callers handle errors (use `handleApiError` for a user-facing message).
 */
import endpoints from '../../constants/endpoints';
import api from '../../services';

import type { CentreBundle, CentreCreateRequest, CentreListRequest, CentreListResponse } from './apiTypes';

// Centre Management can target its own backend (e.g. http://localhost:7071) without
// affecting the other modules. Set REACT_APP_CENTRES_API_BASE_URL to override;
// otherwise the calls use the shared axios instance's base URL.
const centresBaseUrl = process.env.REACT_APP_CENTRES_API_BASE_URL;
const cfg = centresBaseUrl ? { baseURL: centresBaseUrl } : undefined;

/** POST /admin/centres/list — paginated facility rows (skip + limit). */
export async function listCentres(req: CentreListRequest): Promise<CentreListResponse> {
  const body: CentreListRequest = {
    sort: 'createdAtTs',
    order: 'desc',
    ...req,
  };
  const res = await api.post<{ data: CentreListResponse }>(endpoints.centres.centresList, body, cfg);
  return res.data?.data ?? (res.data as unknown as CentreListResponse);
}

/** POST /admin/centres/details — full doc bundle for one centre. */
export async function getCentreDetails(code: string): Promise<CentreBundle> {
  const res = await api.post<{ data: CentreBundle }>(endpoints.centres.centreDetails, { code }, cfg);
  return res.data?.data ?? (res.data as unknown as CentreBundle);
}

/** POST /admin/centres/create — create a centre from the assembled bundle. */
export async function createCentre(payload: CentreCreateRequest): Promise<CentreBundle> {
  const res = await api.post<{ data: CentreBundle }>(endpoints.centres.centreCreate, payload, cfg);
  return res.data?.data ?? (res.data as unknown as CentreBundle);
}

/** POST /admin/centres/update — edit an existing centre (e.g. activate a draft).
 *
 *  The update endpoint keys on `centreId` and accepts the `facility` document
 *  (which carries `status`, so this is what flips draft → active). It does NOT
 *  take the same `lanes[]` / `memberships[]` arrays as /create — those sections
 *  use a different request shape that isn't documented yet, so we omit them and
 *  send only the facility. Plan / lane edits via update are deferred until that
 *  contract is known; activation + facility-level edits work today. */
export async function updateCentre(payload: CentreCreateRequest, centreId: string): Promise<CentreBundle> {
  const body = { centreId, facility: payload.facility };
  const res = await api.post<{ data: CentreBundle }>(endpoints.centres.centreUpdate, body, cfg);
  return res.data?.data ?? (res.data as unknown as CentreBundle);
}
