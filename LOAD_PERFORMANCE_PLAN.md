# Faster Loading Plan (Code-Splitting)

Goal: make the app appear faster on first open by loading **only what's needed, when it's
needed** — instead of shipping the whole app (and heavy libraries) up front.

**Good news:** this is **low-risk and incremental** (unlike the Vite migration). Each step is
independent, changes **no features or UI**, and is verifiable on its own. Safe to do in small PRs.

**Current baseline (from the last prod build):**
- `main.js` ≈ **1.6 MB** — contains 18 page components loaded eagerly.
- Only `Reports` and `Maintenance` are lazy-loaded today (`src/App.tsx:40-41`).
- Heavy libs: `xlsx`, `@react-pdf/renderer`, `recharts`, `react-big-calendar`.

---

## Step 1 — Lazy-load every route (biggest win)
**Where:** `src/App.tsx:13-32` eagerly imports Login, Members, Slots, Tickets, Centres, etc. from the `./pages` barrel.

**Do:** convert each routed page to `React.lazy`, so each page downloads only when the user visits it.
- Keep **Login** + **ForgotPassword** eager (they're the entry screen — needed immediately, and small).
- Make everything else lazy: `const Members = lazy(() => import('./pages/members'));` etc.
- Because `lazy` needs a direct path (not the barrel), import each from its own folder rather than from `./pages`.
- Ensure all `<Route>` elements render inside a `<Suspense fallback={<Loader />}>` (App already uses this pattern for Reports/Maintenance — extend it to cover all).

**Result:** the initial download shrinks to roughly "shell + login." Every other page becomes its own small chunk fetched on navigation.

**Risk:** very low. Behavior identical; the only change is a brief loader the first time a page is opened. The error boundary we added catches load failures.

---

## Step 2 — Defer the Excel library (`xlsx`)
**Where:** `src/pages/waitlist/index.tsx` and `src/pages/waitlist/components/ImportWaitlistModal.tsx` import `xlsx` statically (it's large and loads even for users who never export).

**Do:** load it only when the user clicks Export/Import, using a dynamic import inside the handler:
```
const handleExport = async () => {
  const XLSX = await import('xlsx');   // downloads only on click
  // ...existing export code, unchanged...
};
```
- Wrap in `try/catch` with a `toast.error` in case the chunk fails to download.

**Result:** `xlsx` leaves the main/waitlist bundle; first click has a tiny one-time load.

**Risk:** low. Same export behavior; just loaded on demand.

---

## Step 3 — Defer the PDF library (`@react-pdf/renderer`)
**Where:** `src/pages/reports/pdf/*` (`MembershipReportPdf`, `exportMembershipPdf`, `PdfPreviewModal`). Reports is already lazy, but the PDF engine is heavy even within Reports.

**Do:** dynamically import the PDF module when the user clicks "Export PDF" / opens the preview:
```
const openPdf = async () => {
  const { PdfPreviewModal } = await import('./pdf/PdfPreviewModal');
  // ...
};
```
Or make `PdfPreviewModal` itself a `React.lazy` component rendered only when open.

**Result:** opening Reports is faster; the PDF weight loads only when someone actually exports.

**Risk:** low.

---

## Step 4 — Confirm the calendar library is only in lazy routes
**Where:** `react-big-calendar` is used by `calendar`, `maintenance`, and `centreModules`.

**Do:** ensure the **Calendar** route is lazy (Step 1 covers it), and the centre calendar module is lazy. Maintenance is already lazy.

**Result:** `react-big-calendar` stays out of the main bundle — only loads on those pages.

**Risk:** low.

---

## Step 5 — (Optional) Split large shared vendors
After Steps 1–4, re-check the build. If MUI/recharts still bloat one chunk, consider manual chunking (a `manualChunks` config). **Note:** this is much easier after the Vite migration — consider deferring Step 5 until then.

---

## How to measure success
Run `npm run build:prod` before and after and compare `build/static/js/`:
```
ls -lhS build/static/js/*.js
```
- **Target:** `main.js` drops substantially (the 18 eager pages move into per-route chunks).
- Each page becomes its own small `*.chunk.js` fetched on demand.
- `xlsx` / PDF no longer in the initial download.

Also sanity-check in the browser Network tab: opening `/login` should download far less JS than today.

---

## Verification checklist (no feature/UI change)
- [ ] `npx tsc --noEmit` and `npm run lint` green.
- [ ] `npm run build:prod` succeeds; `main.js` is noticeably smaller.
- [ ] App boots; navigating to each page shows the loader briefly then the page (unchanged).
- [ ] Waitlist Excel export still works (loads on click).
- [ ] Reports PDF export/preview still works (loads on click).
- [ ] Calendar + Maintenance pages render.

## Suggested order & effort
1. Step 1 (routes) — ~half a day, biggest win. Do first.
2. Steps 2–4 (defer heavy libs) — ~half a day total.
3. Step 5 — later, ideally with Vite.

*Plan only — no code changed. Low-risk; can be done in small PRs before or after launch.*
