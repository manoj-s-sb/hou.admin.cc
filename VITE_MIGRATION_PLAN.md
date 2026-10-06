# CRA → Vite Migration Plan

> ⚠️ **Timing:** Do NOT run this the week of a production launch. CRA works today; this is a
> build-tool swap with subtle runtime risks. Schedule it as its own task **after** launch,
> with QA time. Features and screens do not change — only the build underneath does.

**Estimated effort:** 1–3 days including testing. **Do it on a dedicated branch.**

---

## Why we're doing it
- Create React App (`react-scripts`) is officially deprecated/unmaintained.
- ~49 `npm audit` warnings live in CRA's frozen toolchain and can't be patched while on CRA.
- Vite is maintained, faster, supports React 19, and gives real code-splitting.

---

## Pre-flight (baseline — before changing anything)
1. Branch: `git checkout -b chore/vite-migration`.
2. Confirm Node ≥ 20 (`.nvmrc` already says 20).
3. Record the CRA baseline so we can compare:
   - `npm run build:prod` succeeds; note the bundle sizes in `build/`.
   - `npx tsc --noEmit` and `npm run lint` are green.
   - Manually list the critical flows to re-test after (login, forgot-password/OTP,
     RBAC-gated pages, centre wizard, **Excel export**, **PDF export/reports**, notifications).

---

## Step-by-step

### 1. Dependencies
- Add: `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@vitest/coverage-v8`.
- Keep: React, MUI, Tailwind, Redux, etc. (unchanged).
- Remove **after** everything works: `react-scripts`, `eslint-config-react-app` (if used),
  the `react-scripts`-specific `overrides` in `package.json`.

### 2. Entry HTML
- Move `public/index.html` → project-root `index.html`.
- Replace CRA placeholders: `%PUBLIC_URL%/x` → `/x`.
- Add before `</body>`: `<script type="module" src="/src/index.tsx"></script>`.
- Keep other files in `public/` (favicon, etc.) — Vite serves `public/` at `/`.

### 3. `vite.config.ts` (new file)
- Use `@vitejs/plugin-react`.
- `server: { port: 3000, open: true }` (match current dev experience).
- `build: { outDir: 'build', sourcemap: false }` (keeps output folder + our source-maps-off decision).
- `envPrefix: ['REACT_APP_', 'VITE_']` — **lets us keep the existing `REACT_APP_` names** and avoid renaming every env file.

### 4. Environment variables (HIGHEST-RISK STEP — do carefully)
- Vite exposes env as `import.meta.env`, not `process.env`.
- Find every usage: `grep -rn "process.env" src`.
  - `process.env.REACT_APP_API_BASE_URL` → `import.meta.env.REACT_APP_API_BASE_URL`
  - `process.env.NODE_ENV === 'production'` → `import.meta.env.PROD`
  - `process.env.NODE_ENV === 'development'` → `import.meta.env.DEV`
  - `process.env.NODE_ENV !== 'production'` → `!import.meta.env.PROD`
- **Audit these specifically** (they drive real logic, not just cosmetics):
  - `src/services/index.ts` (400-error PII redaction is gated on NODE_ENV)
  - `src/utils/logger.ts` (`isProduction`/`isDevelopment`)
  - `src/index.tsx` (web-vitals dev logging)
- Vite auto-loads `.env`, `.env.development`, `.env.production` by **mode**. You can drop
  `env-cmd` and use `vite --mode development` / `vite build --mode production` instead.

### 5. `package.json` scripts
- `"start": "vite"`, `"start:dev": "vite --mode development"`, `"start:uat": "vite --mode uat"`.
- `"build": "tsc && vite build"`, `"build:prod": "vite build --mode production"`, etc.
- `"test": "vitest"`, `"test:coverage": "vitest run --coverage"`.
- Keep `lint`, `format`, `type-check` as-is.

### 6. Tailwind / PostCSS
- No change needed — Vite reads `postcss.config.js` and `tailwind.config.js` natively.
- Ensure the global CSS import (`import './index.css'`) stays in `src/index.tsx`.

### 7. Node-global-dependent libraries (HIGH-RISK — test the actual features)
- `xlsx` and `@react-pdf/renderer` may expect Node globals (`Buffer`/`process`/`global`)
  that CRA polyfilled but Vite does not.
- If exports/PDFs error at runtime, add polyfills: `vite-plugin-node-polyfills`, or
  `define: { global: 'globalThis' }`, or a small `Buffer` shim.
- **Must manually test:** Waitlist Excel export, Reports PDF export/preview.

### 8. Tests (Jest → Vitest)
- Add `test/setup.ts` importing `@testing-library/jest-dom`.
- `vitest.config` (or merge into `vite.config.ts`): `test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] }`.
- The one existing test (`src/store/calendar/normalize.test.ts`) should run with minor/no changes.
- Remove `setupTests.ts`/CRA test config if present.

### 9. Cleanup
- Delete `react-app-env.d.ts` (CRA types); add `vite/client` to `tsconfig` types if needed
  (`"types": ["vite/client"]`) so `import.meta.env` is typed.
- Remove `reportWebVitals` CRA wiring or keep `web-vitals` directly (still works).
- Update `.gitignore` if needed (Vite build stays in `build/`).

### 10. CI
- `.github/workflows/ci.yml` already uses `npm` and script names — it keeps working as long
  as the script names above stay the same. Re-run it on the migration PR.

---

## Verification checklist (must all pass before merge)
- [ ] `npm run start:dev` — app boots, no console errors, hot reload works.
- [ ] `npm run build:prod` — compiles; `build/` has **no** `.map` files.
- [ ] `npx tsc --noEmit` green; `npm run lint` green.
- [ ] Login + forgot-password/OTP/reset work (env var → API reachable).
- [ ] RBAC: a non-superadmin sees the restricted screens correctly.
- [ ] Centre wizard create/edit works.
- [ ] **Excel export** downloads a valid file.
- [ ] **PDF report** renders/downloads.
- [ ] Prod vs dev behavior correct (error-log PII redaction, logger levels).
- [ ] `npm test` runs the existing test.

## Rollback
- It's all on a branch. If anything is off, `git checkout main` — CRA is untouched there.
- Do not delete `react-scripts` or the CRA config until the checklist is 100% green.

---

*Plan only — no code has been changed. Recommended: execute after the production launch, not before.*
