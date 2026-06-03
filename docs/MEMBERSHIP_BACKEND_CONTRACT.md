# Centre Management & Membership Plans — Backend Integration Contract

This is the contract the **frontend already implements**. Build the backend +
DB to match these shapes and the UI will light up with zero frontend changes.
Until then, both modules fall back to seed data and show a "Showing seed data"
banner.

---

## 0. Cross-cutting conventions

### Base URL
All paths below are relative to `REACT_APP_API_BASE_URL` (set per env in
`.env.development` / `.env.uat` / `.env.production`). Current dev value:
`https://sbcc-func-auth-dev.azurewebsites.net`.

### Response envelope
Every list/detail endpoint must wrap its payload in a `data` key:

```json
{ "data": <payload> }
```

The hooks read `res.data?.data ?? res.data`, so a bare array also works, but
prefer `{ "data": [...] }` for consistency. Return an **empty array** (not 404)
when there are legitimately no rows — a 404/network error makes the UI fall back
to seed data.

### Auth
`Authorization: Bearer <access_token>` is attached by the shared axios instance
(`src/services`). Login response shape (`POST /admin/auth/login`):

```json
{
  "status": "success",
  "message": "...",
  "statusCode": "200",
  "data": {
    "user": { "id", "userId", "email", "firstName", "lastName",
              "userType": ["superadmin"], "facilityCode", "status",
              "createdAt", "lastLoginAt" },
    "tokens": { "access_token", "token_type", "expires_in", "refresh_token" },
    "permissions": {
      "role": "superadmin",
      "facilityCode": "HOU01",
      "modules": { "members": ["read","write"], "maintenance": ["read"], ... }
    }
  }
}
```

### ⚠️ Super-admin role gate (important)
Centre Management and Membership Plans are **super-admin only**. The frontend
treats a user as super admin when `permissions.role` (falling back to
`user.userType[0]`) is one of — compared **case-insensitively**:

```
stancebeamadmin | superadmin
```

→ The role string your auth service emits for a super admin **must be one of
those two values**. (If you introduce a third spelling, add it to
`SUPER_ADMIN_ROLES` in `src/rbac/constants.ts` and `src/utils/permissions.ts`.)

Module-gated features key off `permissions.modules[<module>]` containing
`"read"` / `"write"`.

---

## 1. Membership Plans  (NEW — primary ask)

Global plan templates: defined once, assigned to centres with local pricing.

### Endpoints
| Method | Path                                | Purpose                |
|--------|-------------------------------------|------------------------|
| GET    | `/admin/membership-plans`           | List all plan templates |
| POST   | `/admin/membership-plans`           | Create a plan          |
| PUT    | `/admin/membership-plans/:id`       | Update a plan          |
| POST   | `/admin/membership-plans/:id/archive` | Archive a plan       |

`GET` returns `{ "data": MembershipPlan[] }`. `POST`/`PUT` receive a full
`MembershipPlan` body and should return the saved row (in `data`).

### `MembershipPlan` shape → maps 1:1 to a DB table

| Field                  | Type                                            | Notes |
|------------------------|-------------------------------------------------|-------|
| `id`                   | string                                          | PK. New plans send a slug derived from `code` |
| `name`                 | string                                          | e.g. "Premium" |
| `code`                 | string                                          | lowercase system code, e.g. "premium" |
| `description`          | string?                                         | member-facing blurb |
| `colour`               | string (hex)                                    | column accent |
| `fortnightlyPrice`     | number                                          | USD base (reference) |
| `annualPrice`          | number                                          | USD base (reference) |
| `accessType`           | `'24/7'｜'offpeak'｜'nightowl'｜'custom'`        | |
| `accessHours`          | string                                          | human-readable window |
| `peakAccess`           | boolean                                         | |
| `slotsPerCycle`        | number                                          | per fortnightly cycle; **0 = unlimited** |
| `dailyBookingLimit`    | number                                          | |
| `maxFutureBookings`    | number                                          | |
| `carryover`            | number                                          | unused slots → next cycle; 0 = none |
| `carryCap`             | number                                          | max accumulated; 0 = N/A |
| `advanceWindowDays`    | number                                          | |
| `extraSessionEnabled`  | boolean                                         | fortnightly only |
| `extraSessionPrice`    | number                                          | USD default |
| `eligibility`          | `{ adult:bool, junior:bool, family:bool }`      | |
| `additionalMemberFee`  | number｜null                                    | family add-on; null = N/A |
| `memberCap`            | number                                          | network-wide; 0 = unlimited |
| `centresActive`        | number                                          | count of centres using this plan |
| `regions`              | string[]                                        | country/region codes; `['all']` = everywhere |
| `status`              | `'active'｜'archived'`                           | |

Authoritative definitions: `src/pages/membership/types.ts`. Seed/reference
values (the 5 default plans): `src/pages/membership/seed.ts`.

> Pricing is **USD reference only**. Per-centre actual pricing lives on the
> centre↔plan assignment (see Centre Management). Currency display in the UI is
> client-side conversion (`src/pages/membership/constants.ts`).

---

## 2. Centre Management  (already implemented earlier)

### Endpoints (`src/constants/endpoints.ts → centres`)
| Method | Path                                          | Purpose |
|--------|-----------------------------------------------|---------|
| GET    | `/admin/centres`                              | List centres + KPI snapshot |
| POST   | `/admin/centres/wizard/start`                 | Begin new-centre wizard → `{ data: { id } }` |
| PATCH  | `/admin/centres/wizard/:id/step:n`            | Persist wizard step n |
| GET    | `/admin/centres/wizard/:id/review`            | Wizard review payload |
| POST   | `/admin/centres/wizard/:id/save-draft`        | Save as draft |
| POST   | `/admin/centres/wizard/:id/save-activate`     | Save + activate |
| GET    | `/admin/centres/:id/members`                  | Centre members (supports `?search&plan&status`) |
| GET    | `/admin/centres/:id/bookings`                 | Centre bookings |

### Shapes
Authoritative definitions in `src/pages/centres/types.ts`:
`Centre`, `CentreKPISnapshot`, `CentreWithKPI` (list rows), `NetworkSummary`,
`CentrePlanAssignment` (the per-centre plan pricing/limits), `CentreMember`,
`CentreBooking`, and the wizard models (`WizardState`, `WizardPlanRow`,
`AdditionalFacility`).

`GET /admin/centres` returns `{ "data": CentreWithKPI[] }` — each centre row
carries a nested `kpi` object (members, utilisation, no-show, plan breakdown).

---

## 3. Wiring the backend in (frontend changes = none)

1. Implement the endpoints above returning the documented shapes in `{ data }`.
2. Ensure the super-admin `role` string is `superadmin` or `stancebeamadmin`.
3. Point `REACT_APP_API_BASE_URL` at your backend.
4. The seed-fallback banners disappear automatically once the endpoints return
   non-empty `data`. To remove seed fallback entirely later, drop the
   `.catch(seed)` branches in `usePlans.ts` / `useCentres.ts`.
