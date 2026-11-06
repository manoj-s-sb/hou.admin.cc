# ✅ Testing Checklist — Change Tracker

> **How to use this file**
> Every change we make gets a row here with **how to test it**.
> After you test something and it works, change its status to **✅ Done (green)**.
> That way anyone can glance at this file and instantly see what's finished and what's still pending.

## 🔑 Status legend

| Marker            | Meaning                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| ✅ **Done**       | Tested in the running app — works, no issues                            |
| 🟡 **Code ready** | Code written + type-check passes, **but not yet tested in the browser** |
| ⬜ **Pending**    | Not started / waiting                                                   |
| ↩️ **Reverted**   | Was done, then removed on request — no longer active                    |

_Branch:_ `release/uat-v1.0`
_Last updated:_ 2026-11-05

---

## 📋 Summary

| #   | Change                                            | Status        |
| --- | ------------------------------------------------- | ------------- |
| 1   | Global 20-second API timeout                      | 🟡 Code ready |
| 2   | Permissions update instantly (RBAC reactivity)    | 🟡 Code ready |
| 3   | New **preprod** environment + start/build scripts | 🟡 Code ready |
| 4   | Merge `pre-prod-uat-v1.0` into `uat-v1.0`         | ✅ Done       |
| 5   | Remove top header / move profile to sidebar (UI)  | ↩️ Reverted   |

---

## 1. Global 20-second API timeout 🟡

**What changed:** Every API call now gives up after **20 seconds** instead of hanging forever.
**File:** `src/services/index.ts` (`timeout: 20000` on the shared axios instance)
**Why:** If the backend is slow/stuck, the app fails fast instead of freezing.

**How to test:**

- [ ] Normal pages still load data as before (login, members, centres, slots).
- [ ] If the backend is unreachable/slow, the request stops after ~20s (doesn't spin forever).
- [ ] No new error toast appears for normal successful calls.

**Status:** 🟡 Code ready · type-check ✅
_Flip to_ ✅ **Done** _after the above pass._

---

## 2. Permissions update instantly — RBAC reactivity 🟡

**What changed:** When a user's permissions change mid-session, the screen now updates right away instead of showing the old access until the next navigation/refresh.
**Files:** `src/rbac/PermissionRoute.tsx`, `src/rbac/PermissionGate.tsx` (added a `useSelector` subscription to `auth.permissions`)
**Why:** Fixes a stale-UI gap. **No decision logic changed** — `permissions.ts` helpers are untouched.

**How to test:**

- [ ] Log in as a normal (non-superadmin) user — correct menu items / pages show.
- [ ] Log in as a superadmin — full access shows.
- [ ] A restricted module still shows "Restricted" / is blocked as before.
- [ ] (If possible) change a role/permission while logged in → the UI reflects it without a manual refresh.
- [ ] Gated buttons (`PermissionGate`) still block + show the "permission required" toast when not allowed.

**Status:** 🟡 Code ready · type-check ✅
_Flip to_ ✅ **Done** _after the above pass._

---

## 3. New **preprod** environment + scripts 🟡

**What changed:** Added a preprod environment pointing at the working backend, plus npm scripts to run it.
**Files:**

- `.env.preprod` → `REACT_APP_API_BASE_URL=https://cc-adminportal-func-uat-fzetfwg8b0d9hyas.southindia-01.azurewebsites.net`
- `package.json` → `start:preprod`, `build:preprod`

**Why:** The old UAT/prod hostnames no longer resolve (caused `ERR_NAME_NOT_RESOLVED` on login). This host resolves and responds.

**How to test:**

- [ ] Run `npm run start:preprod` — app boots.
- [ ] Login succeeds (no `ERR_NAME_NOT_RESOLVED` in the Network tab).
- [ ] Data loads from the preprod backend across a few pages.
- [ ] `npm run build:preprod` completes without errors.

**Status:** 🟡 Code ready · host resolves ✅ · server responds (HTTP 400 on empty login body) ✅
_Flip to_ ✅ **Done** _after a real login works._

---

## 4. Merge `pre-prod-uat-v1.0` into `uat-v1.0` ✅

**What changed:** Pulled in 34 commits from `origin/release/pre-prod-uat-v1.0` (clean fast-forward). My in-progress work was preserved.
**Why:** Bring this branch up to date with pre-prod.

**How verified:**

- [x] Fast-forward merge — no conflicts.
- [x] Stashed work reapplied cleanly.
- [x] `tsc --noEmit` passes.
- [x] No dependency changes (only a lint script tweak).

**Status:** ✅ Done

---

## 5. Remove top header / move profile to sidebar (UI) ↩️

**What changed → then reverted:** Briefly removed the top header and moved the user profile + notifications bell to the sidebar bottom, then **reverted on request**.
**Files:** `src/components/Layout.tsx`, `src/components/Sidebar.tsx` (restored to pre-change version)
**Current state:** Original top header is back; sidebar footer removed.

**How to confirm the revert:**

- [ ] Top header (gradient bar with notifications bell + profile menu) is visible again.
- [ ] Sidebar has **no** profile/notifications block at the bottom.
- [ ] Logout and notifications still work from the header.

**Status:** ↩️ Reverted · type-check ✅

---

## 📝 Notes

- `.env.*` files are **tracked** in this repo (they commit along with code).
- `.env.production` / `.env.uat` currently show as locally modified — **not changed by these tasks**.
- Add a new numbered section here for every future change, with its own test steps and status.
