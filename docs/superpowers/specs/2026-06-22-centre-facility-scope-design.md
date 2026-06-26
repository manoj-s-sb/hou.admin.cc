# Centre Facility-Scope — System Architecture & Flow

**Status:** Draft for review
**Date:** 2026-06-22

> All diagrams are plain ASCII — they render in any Markdown preview, no plugin needed.

## Problem

Every centre-scoped API needs a `facilityCode`. Today each thunk passes it by hand
(`src/store/centres/api.ts`), which couples the code into the centre page and means
_every new module/call must remember to add it_. We want:

1. One **separate localStorage key** that holds the active facility code.
2. The code attached to **every API request automatically** — in the **request body**
   (the codebase convention; e.g. `slots/api.ts:13`, `maintenance/api.ts:13`).
3. Correct behaviour for **3 roles**: superadmin (picks a centre), coach admin & staff
   (facility assigned at login, fixed).
4. A **dynamic module list** — only _Members_ today, more modules added later by
   dropping in a file, with no edits to the sidebar or a giant switch.

Field name is fixed: **`facilityCode`** (already used by existing body calls).

---

## 1. System architecture (layers)

```
                          UI LAYER
 ┌───────────────────────────────────────────────────────────────┐
 │  SUPERADMIN                      COACH / STAFF                  │
 │  Centre Management               lands directly in their       │
 │  browse + pick a centre          facility's modules            │
 │        │                                  │                     │
 │        │ openCentre(code)                 │                     │
 │        ▼                                  ▼                     │
 │   ┌─────────────────  CENTRE MODULE SCREENS  ────────────────┐  │
 │   │  Members (today)   ·   more modules (later)              │  │
 │   └──────────────────────────┬───────────────────────────────┘ │
 └──────────────────────────────┼─────────────────────────────────┘
            (writes key)         │ api.post(...)        (no key, uses login)
            ▼                     │                                ▼
 ┌──────────────────────┐        │              ┌──────────────────────────┐
 │ localStorage          │        │              │ Redux auth (persisted)    │
 │ 'hou.activeFacilityCode'│      │              │ auth.user.facilityCode    │
 │ set ONLY when a        │       │              │ assigned at login         │
 │ superadmin opens a     │       │              │                           │
 │ centre                 │       │              │                           │
 └───────────┬───────────┘        │              └─────────────┬─────────────┘
             │                     │                            │
             └──────────►  resolveFacilityCode()  ◄─────────────┘
                          selected centre ?? assigned facility
                                       │
                                       ▼
                       NETWORK LAYER — services/index.ts
                 ┌─────────────────────────────────────────┐
                 │ axios request interceptor                │
                 │  1. attach Bearer token (exists)         │
                 │  2. inject facilityCode into BODY (write) │
                 │     or params (read)                     │
                 └────────────────────┬────────────────────┘
                                      ▼
                              ┌───────────────┐
                              │   Backend     │
                              │ { ...payload, │
                              │  facilityCode}│
                              └───────────────┘
```

Key point: modules **never** read or pass the facility code. They just call the API;
the interceptor + resolver attach it. Superadmin _feeds_ the resolver by selecting a
centre; coach/staff have it _pre-fed_ by login.

---

## 2. The resolver — one rule for all roles

```
                  resolveFacilityCode()
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │ localStorage 'hou.activeFacilityCode' │
        │ set?                                  │
        └──────────┬───────────────────┬────────┘
              YES  │                    │  NO
   (superadmin opened a centre)   (coach / staff — never set)
                   │                    │
                   ▼                    ▼
        use SELECTED centre    use auth.user.facilityCode
        code                   (assigned facility)
                   │                    │
                   └─────────┬──────────┘
                             ▼
                 facilityCode → interceptor
```

- **Superadmin**: assigned code is empty → only the _selected_ centre drives it.
- **Coach / Staff**: never set localStorage → always falls through to _assigned_ code.

---

## 3. How the code gets into the request (BODY, not header)

```
                        api request
                            │
                            ▼
              code = resolveFacilityCode()
                            │
              ┌─────────────┴─────────────┐
          empty                       has code
              │                           │
              ▼                           ▼
       send unchanged              method?
                            ┌───────────┴────────────┐
                     POST / PUT / PATCH         GET / DELETE
                            │                        │
                            ▼                        ▼
              config.data =                 config.params =
              { ...data, facilityCode }     { facilityCode, ...params }
              (skip if already set;                │
               skip FormData)                      │
                            └───────────┬───────────┘
                                        ▼
                                      send
```

Illustrative interceptor logic (added in `services/index.ts`, right after the Bearer block):

```ts
const code = resolveFacilityCode();
if (code) {
  const method = (config.method ?? 'get').toLowerCase();
  const isWrite = method === 'post' || method === 'put' || method === 'patch';
  if (isWrite && !(config.data instanceof FormData)) {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data ?? {});
    if (body.facilityCode === undefined) body.facilityCode = code; // don't override explicit
    config.data = body;
  } else if (!isWrite) {
    config.params = { facilityCode: code, ...(config.params ?? {}) };
  }
}
```

Result: a thunk like `api.post(endpoints.members.list, { skip, limit })` goes out as
`{ skip, limit, facilityCode: "US-HOU-01" }` with **no change to the thunk**.

---

## 4. Superadmin journey (picks Houston, then switches to Bangalore)

```
 Superadmin        Centre Mgmt UI      localStorage      axios          Backend
     │                   │                  │              │               │
     │ login (code="")   │                  │              │               │
     ├──────────────────►│                  │              │               │
     │                   │ list centres ────┼─────────────►│ { } (no code) │
     │                   │                  │              ├──────────────►│
     │                   │◄─────────────────┼──────────────┤ all centres   │
     │                   │ 🇮🇳 Bangalore  🇺🇸 Houston       │               │
     │ open Houston      │                  │              │               │
     ├──────────────────►│ set = US-HOU-01 ►│              │               │
     │                   │ route /centres/US-HOU-01/members │               │
     │                   │ members.list ────┼─────────────►│{...,US-HOU-01}│
     │                   │                  │              ├──────────────►│
     │                   │◄─────────────────┼──────────────┤ Houston data  │
     │ Back to Centres   │                  │              │               │
     ├──────────────────►│ clear key ──────►│              │               │
     │ open Bangalore    │ set = IN-BLR-01 ►│              │               │
     │                   │ members.list ────┼─────────────►│{...,IN-BLR-01}│
     │                   │◄─────────────────┼──────────────┤ Bangalore data│
```

## 5. Coach / Staff journey (facility fixed at login)

Coach admin and staff are **identical** — both non-superadmin, both scoped to one
assigned facility. Only the code value differs.

```
 Coach (Bangalore) /        App            axios               Backend
 Staff (Houston)             │               │                    │
     │  login                │               │                    │
     ├──────────────────────►│               │                    │
     │   auth.user.facilityCode = IN-BLR-01  │                    │
     │   localStorage NEVER set              │                    │
     │  land in Members      │               │                    │
     │  (no picker,          │               │                    │
     │   no "Back to Centres")               │                    │
     │                       │ members.list ►│                    │
     │            resolveFacilityCode():      │                   │
     │            localStorage empty →        │                   │
     │            fall through to assigned    │                   │
     │                       │               │ {...,IN-BLR-01} ──►│
     │                       │◄──────────────┤ their facility data│
```

---

## 6. Role comparison

|                         | Superadmin               | Coach admin     | Staff           |
| ----------------------- | ------------------------ | --------------- | --------------- |
| assigned `facilityCode` | "" (none)                | e.g. IN-BLR-01  | e.g. US-HOU-01  |
| sees Centre Mgmt list   | yes (all centres)        | no              | no              |
| picks a centre          | yes                      | no              | no              |
| localStorage key set    | on open, cleared on back | never           | never           |
| code source             | selected centre          | assigned (auth) | assigned (auth) |
| "Back to Centres"       | yes                      | no              | no              |
| can switch centres      | yes                      | no (locked)     | no (locked)     |

---

## 7. Dynamic module list (Members today, more tomorrow)

One config array is the single source; the sidebar, the routes, and the default landing
are all generated from it. Adding a module = add one file + one entry. No sidebar edits,
no `module === 'x'` switch (the current switch in `CentreDetailView.tsx:182-477` is
retired into per-module route files).

```
        CENTRE_MODULE_REGISTRY
        [ { key, label, icon, path, component, module } ]
                     │
       ┌─────────────┼──────────────────┐
       ▼             ▼                   ▼
 Sidebar items    Routes            Default landing
 (filtered by     /centres/         (first readable
  canRead →       :facilityCode/     entry)
  RBAC per role)  <path>
```

```ts
// Today the registry holds ONLY this:
{ key: 'members', label: 'Members', icon: <…>, path: 'members',
  component: CentreMembers, module: ACCESS_SCOPES.members }
// Tomorrow: append { key:'bookings', ... } + a CentreBookings.tsx → done.
```

UI note: same Tailwind components and markup as today; **no new background colours added.**

---

## Open items before implementation

1. Confirm `facilityCode` body-injection (this doc) is the intended mechanism.
2. **Decision 3 — which modal needs a "Back" button** (New Centre is a full-page wizard,
   not a modal — so: a centre-detail modal? the create-summary screen? a specific modal
   in the HTML reference?).
