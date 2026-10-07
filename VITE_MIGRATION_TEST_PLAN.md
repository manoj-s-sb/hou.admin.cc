# Vite Migration — Test Plan (do in this priority order)

The CRA → **Vite** migration is on branch **`chore/vite-migration`**. The automated checks already pass:

- ✅ `tsc --noEmit` (TypeScript 5 + bundler resolution) — 0 errors
- ✅ `npm run build:prod` (Vite) — succeeds in ~7s, source maps off
- ✅ Vite dev server boots (~150 ms) and serves the app
- ✅ `vitest` runs (13/14 tests pass — see the "Known issue" note at the bottom)

**But a passing build does NOT prove the app works at runtime.** Some libraries (PDF, Excel) and env/config behave differently under Vite and can only be confirmed by **clicking through the app in a real browser**. Test the items below **in order** — the 🔴 ones are where this migration is most likely to break.

## How to run it

```
git checkout chore/vite-migration
npm install
npm run start:dev        # dev server at http://localhost:3000
# and, to test the real production output:
npm run build:prod && npm run preview
```

**Rollback at any time:** `git checkout test/bugs0.1` — the old CRA setup is untouched there. Nothing here is permanent until this branch is merged.

---

## 🔴 P0 — MUST pass (highest break-risk). If any fails, do not merge.

### 1. App boots + Login works
- [ ] Open `http://localhost:3000` → the login page renders (logo, fonts, styling all look right).
- [ ] Log in with a real account → you reach the dashboard.
- **Why risky:** the API URL moved from `process.env.REACT_APP_API_BASE_URL` to `import.meta.env.REACT_APP_API_BASE_URL`. If it didn't carry over, **login (and everything) fails with network errors**. Check the browser Network tab — requests should go to the correct backend URL, not `undefined`.

### 2. PDF export / preview (Reports)  ← the #1 Vite risk
- [ ] Go to **Reports** → apply filters → **Export / Preview PDF**.
- [ ] The PDF preview opens and renders, and the download works.
- **Why risky:** `@react-pdf/renderer` relies on Node-style globals (`Buffer`/`process`) that CRA auto-provided but Vite does **not**. The build passed, but this can still **throw at runtime when you click export**. If it errors (check the console), the fix is a Vite polyfill (`vite-plugin-node-polyfills` or `define: { global: 'globalThis' }`) — tell me and I'll add it.

### 3. Excel export + import (Waitlist / Leads)
- [ ] On a centre's **Leads/Waitlist** → **Export** → a valid `.xlsx` downloads and opens in Excel.
- [ ] **Import from Excel** → upload a `.xlsx` → rows parse correctly.
- **Why risky:** same as PDF — `xlsx` can expect Node globals. Test both export **and** import.

---

## 🟠 P1 — Should pass (important flows)

### 4. Calendar + Maintenance pages
- [ ] Open **Slot Bookings / Calendar** and **Maintenance** → the calendar grid renders **with correct styling**.
- **Why risky:** these import `react-big-calendar/lib/css/react-big-calendar.css`. If the calendar looks unstyled/broken, the CSS import needs attention.

### 5. Dev-vs-Prod behaviour
- [ ] Run the **production** build (`npm run build:prod && npm run preview`) and confirm the app still works there (not just dev).
- [ ] Trigger a failing request (e.g. wrong login) → confirm errors are handled the same as before.
- **Why risky:** `process.env.NODE_ENV` checks became `import.meta.env.PROD/DEV`. These drive the logger levels and the 400-error PII redaction in `services/index.ts`. Confirm prod behaves like prod.

### 6. Permissions (RBAC)
- [ ] Log in as a **non-superadmin** (e.g. coach) → confirm you only see the pages/actions you should, and restricted pages show the "no access" screen.
- **Why risky:** core security behaviour — must be identical to before.

### 7. Centre wizard (create / edit)
- [ ] Open **Centre Management → New Centre**, step through, and save.
- [ ] **Edit** an existing centre and save.
- **Why risky:** the biggest, most complex screen — good smoke test that lazy-loaded pages mount correctly.

---

## 🟡 P2 — Quick sanity sweep

- [ ] Click through **every** sidebar page once → each loads (no blank screen / console error). This confirms all the lazy-loaded route chunks resolve.
- [ ] Logo / brand images and the **favicon** show up (asset paths: `%PUBLIC_URL%` → `/`).
- [ ] Toasts (success/error messages) still appear.
- [ ] A couple of forms submit correctly (e.g. add a lead, add a staff member).
- [ ] Browser console has **no red errors** during normal use.

---

## ✅ Merge criteria
Merge `chore/vite-migration` only when **all 🔴 P0 and 🟠 P1 pass**. P2 issues can be fixed after but should be logged.

## What changed in this migration (for reviewers)
- Build tool: **Create React App (`react-scripts`) → Vite 5** (`vite.config.ts`, root `index.html`).
- TypeScript **4.9 → 5.9**, `moduleResolution: "node" → "bundler"`.
- Tests: **Jest (via react-scripts) → Vitest** (same tests, `vitest` config in `vite.config.ts`).
- Env: `process.env.REACT_APP_* / NODE_ENV` → `import.meta.env.*` (5 spots); `.env.*` files unchanged (kept the `REACT_APP_` prefix via `envPrefix`).
- Removed `react-scripts`, `env-cmd`; `@types/node` 16 → 20.
- Code-splitting, source-maps-off, and the `build/` output dir all preserved.

## ⚠️ Known issue to look at (not a blocker for testing the app)
`vitest` reports **1 failing test** in `src/store/calendar/normalize.test.ts` (an event-ordering assertion). The source it tests was **not changed** by this migration, so it's either pre-existing or **timezone-sensitive** (the test may assume a specific machine timezone). Worth a look, but it does not affect whether the app runs.
