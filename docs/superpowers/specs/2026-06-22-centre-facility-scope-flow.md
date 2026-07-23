# Centre Facility-Scope — Implementation Flow & System Design

**Status:** Implemented
**Date:** 2026-06-22

> All diagrams are plain ASCII — render in any Markdown preview, no plugin needed.

## What this feature does

A superadmin browses all centres, opens one, and works inside it (today: the Members
module). The opened centre's `facilityCode` is remembered and the URL reflects it
(`/centres/:facilityCode/members`). Coach/staff have a facility assigned at login and
never pick a centre — the same screens scope to their facility automatically.

Two hard rules honoured:

- **No endpoint / api-thunk changes** — the facility code is supplied from the UI layer.
- **Reuse the existing pages** — the centre's Members view IS the `/members` page,
  same UI and flow.

---

## 1. File responsibilities (who carries what)

```
constants/routes.ts          ROUTES.CENTRE_MEMBERS = '/centres/:facilityCode/members'
                             buildRoute.centreMembers(code) → that path

utils/facilityScope.ts       THE source of truth for "which facility".
                             localStorage keys:
                               • centreFacilityCode  — the opened centre (superadmin)
                               • isCenterManagement   — superadmin is in Centre Mgmt
                             API: set / get / clear / enterManagement / isManagement / reset
                             SCOPED — opt-in marker for the interceptor (see §4)

services/index.ts            axios request interceptor.
                             resolveFacilityCode() = facilityScope.get()  (selected centre)
                                                     || auth.user.facilityCode (assigned)
                             Injects facilityCode ONLY into calls flagged SCOPED.

pages/centres/index.tsx      Centre LIST (route /centres). On mount: enterManagement()
                             + closeCentre() (global sidebar). Card click → set code +
                             navigate to the centre Members path.

pages/centres/CentreMembersRoute.tsx
                             Route target for /centres/:facilityCode/members.
                             Reads :facilityCode, rehydrates the centre context (so the
                             sidebar + scope survive refresh), renders CentreDetailView.

pages/centres/components/CentreDetailView.tsx
                             Centre header (name, status, Edit & Activate) + renders the
                             existing <Members/> page as the single module content.

pages/members/index.tsx      The existing Members page. Builds its request body with
                             scopedFacilityCode() = facilityScope.get() || getLocalUser().facilityCode
                             → works for BOTH a superadmin-opened centre and coach/staff.

components/Sidebar.tsx       One sidebar. Shows the global menu normally; swaps to the
                             centre nav (Back to Centres + live modules) when a centre is
                             active. Module click + Back navigate by URL.

pages/centres/centreModules.tsx
                             CENTRE_MODULE_GROUPS — the live module list (today: Members).
                             CENTRE_MODULE_LIBRARY — parked defs for modules not yet live.

contexts/CentreNavContext.tsx
                             In-memory activeCentre + module (drives the sidebar swap).
                             openCentre() also writes facilityScope; closeCentre() clears it.

App.tsx                      Registers both routes (global /members and centre members),
                             each via PermissionRoute → Layout (Sidebar).
```

---

## 2. Routes

```
/members                          → <Members/>            (global; coach/staff)
/centres                          → <CentreManagement/>   (centre list; superadmin)
/centres/:facilityCode/members    → <CentreMembersRoute/> → <CentreDetailView/> → <Members/>
```

Both Members routes use the SAME component and the SAME permission scope
(`ACCESS_SCOPES.members`). Only the facility source differs.

---

## 3. Navigation flow (superadmin)

```
 [/centres]  Centre list
 CentreManagement mount:
   facilityScope.enterManagement()   → localStorage isCenterManagement = true
   closeCentre()                     → sidebar = global menu
        │
        │  click centre card "SD001"
        ▼
   facilityScope.set('SD001')        → localStorage centreFacilityCode = SD001
   navigate('/centres/SD001/members')
        │
        ▼
 [/centres/SD001/members]  Route: CentreMembersRoute
   reads :facilityCode = SD001
   if context not for SD001 → openCentre({code:SD001, name from centres list…})
        │                              (openCentre also calls facilityScope.set)
        ▼
   Sidebar sees activeCentre → swaps to CENTRE NAV
   ┌─────────────────────────┐      CentreDetailView
   │ ‹ Back to Centres        │      ┌───────────────────────────────┐
   │ ● SD001  (centre name)   │      │ Header: name · status · Edit  │
   │ OPERATIONS               │      │ ───────────────────────────── │
   │ • Members   ◀ active     │      │ <Members/>  (existing page)   │
   └─────────────────────────┘      │  builds body:                 │
        │                            │  facilityCode = facilityScope │
        │                            │       .get() = SD001          │
        │                            └───────────────────────────────┘
        │  click ‹ Back to Centres
        ▼
   closeCentre()  → facilityScope.clear() (centreFacilityCode removed) + context cleared
   navigate('/centres')  → back to list, global sidebar
```

## 3b. Navigation flow (coach / staff)

```
 login → auth.user.facilityCode = IN-BLR-01 ; centreFacilityCode NEVER set
        │
        ▼
 [/members]  the same Members page
   scopedFacilityCode() = facilityScope.get()('')  || getLocalUser().facilityCode
                        = IN-BLR-01
   → members API body carries facilityCode = IN-BLR-01
 No centre picker, no "Back to Centres".
```

---

## 4. How the facility code reaches the API

There are two layers; today the Members module uses the first.

```
 (A) EXPLICIT (live today, Members module)
     pages/members/index.tsx
        payload.facilityCode = scopedFacilityCode()
        scopedFacilityCode() = facilityScope.get()  || getLocalUser().facilityCode
                               (selected centre)        (assigned facility)
        dispatch(getMembers(payload))   → body already contains facilityCode
        → NO interceptor needed, NO api/endpoint change.

 (B) OPT-IN INTERCEPTOR (available for future modules; dormant today)
     A call passes the SCOPED marker:
        api.post(url, body, SCOPED)
     services/index.ts interceptor then injects resolveFacilityCode():
        write (POST/PUT/PATCH) → into body   { …, facilityCode }
        read  (GET)            → into params { facilityCode, … }
     Calls WITHOUT SCOPED are never touched → strict-schema endpoints stay safe.
```

Decision rule for the resolver (both layers share it conceptually):

```
        selected centre (facilityScope.get) ?  → use it      (superadmin in a centre)
                                             :  → use auth.user.facilityCode (coach/staff)
```

---

## 5. Sidebar swap logic

```
 Sidebar.tsx
   activeCentre == null  → GLOBAL menu (menus[], filtered by canRead)
   activeCentre != null  → CENTRE nav:
        ‹ Back to Centres            → closeCentre() + navigate('/centres')
        centre identity (name, code, status dot)
        CENTRE_MODULE_GROUPS.map → buttons (today: Members)
           click → setModule + navigate('/centres/<code>/members')
   Same Tailwind item styling as the global menu (no separate blue panel).
```

---

## 6. localStorage keys

| key                  | type   | set when                       | cleared when             | read by                                          |
| -------------------- | ------ | ------------------------------ | ------------------------ | ------------------------------------------------ |
| `centreFacilityCode` | string | superadmin opens a centre      | Back to Centres / logout | facilityScope.get → Members page + resolver      |
| `isCenterManagement` | 'true' | superadmin lands on `/centres` | logout                   | facilityScope.isManagement (flag for future use) |

---

## 7. Role summary

|                              | Superadmin                | Coach admin     | Staff           |
| ---------------------------- | ------------------------- | --------------- | --------------- |
| assigned `user.facilityCode` | ""                        | e.g. IN-BLR-01  | e.g. US-HOU-01  |
| sees `/centres` list         | yes                       | no              | no              |
| `centreFacilityCode` set     | on open                   | never           | never           |
| URL while in members         | `/centres/<code>/members` | `/members`      | `/members`      |
| facility code source         | selected centre           | assigned (auth) | assigned (auth) |
| "Back to Centres"            | yes                       | no              | no              |

---

## Open / future

- `isCenterManagement` is written but not yet read — reserved for branching behaviour
  (e.g. forcing the centre flow). Decide its consumer or leave as a flag.
- Adding a module = add its entry to `CENTRE_MODULE_GROUPS` (+ a route + a `buildRoute`
  for its path). The Sidebar and routing scale from there.
- Centre header (Edit & Activate) currently renders on the centre route via
  CentreDetailView — keep or drop per product preference.
