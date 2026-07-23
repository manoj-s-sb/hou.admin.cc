# hou.admin.cc

Admin console for the Hou platform — manages members, inductions, slots, coaches, maintenance, tailgates, staff, and centres. Bootstrapped with Create React App; written in React 19 + TypeScript + Redux Toolkit + MUI + Tailwind.

> **Branching:** `main` is the production line. Feature work merges into `release/dev-v1.0` and then promotes upward through `uat` and finally `main`.

## Prerequisites

- Node 22.x (matches CI — see `.github/workflows/feature-branch-ci.yml`)
- npm 10+

## Setup

```bash
npm install
npm run start:dev          # runs against the dev API
```

The app serves on http://localhost:3000.

## Environments

Three env files live at the repo root. Each ships only the public API base URL — no secrets.

| File               | API base URL                           | Used by                    |
| ------------------ | -------------------------------------- | -------------------------- |
| `.env.development` | `sbcc-func-auth-dev.azurewebsites.net` | `start:dev`, `build:dev`   |
| `.env.uat`         | UAT Azure function                     | `start:uat`, `build:uat`   |
| `.env.production`  | Production Azure function              | `start:prod`, `build:prod` |

Required vars: `REACT_APP_API_BASE_URL`, `REACT_APP_ENV`. The axios client in `src/services/index.ts` reads `REACT_APP_API_BASE_URL` at boot.

## Scripts

| Command                 | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| `npm run start:dev`     | Dev server against the dev API                |
| `npm run start:uat`     | Dev server against the UAT API                |
| `npm run start:prod`    | Dev server against production (use sparingly) |
| `npm run build:dev`     | Production-style build with dev env           |
| `npm run build:uat`     | UAT build                                     |
| `npm run build:prod`    | Production build                              |
| `npm run lint`          | ESLint over `src/`                            |
| `npm run lint:fix`      | ESLint with `--fix`                           |
| `npm run format`        | Prettier write                                |
| `npm run format:check`  | Prettier check (no write)                     |
| `npm run check`         | Lint + format check                           |
| `npm run type-check`    | `tsc --noEmit`                                |
| `npm test`              | Jest watch mode                               |
| `npm run test:coverage` | One-shot coverage run                         |
| `npm run clean`         | Remove `build/` and `node_modules/`           |

## Project layout

```
src/
  App.tsx              # routing + global providers (Redux, Persist, Toaster)
  index.tsx            # bootstrap, attaches store to axios
  pages/               # feature pages — each folder owns its UI, sub-components, and helpers
  components/          # cross-cutting UI (Layout, Sidebar, DataTable, Loader, etc.)
  store/               # one folder per domain — { api.ts, reducers.ts, types.ts }
    store.ts           # combineReducers, configureStore, RootState, AppDispatch
    persistConfig.ts   # redux-persist whitelist
  services/            # single axios instance + interceptors (auth, session expiry)
  rbac/                # permission-gated route + component wrappers
  constants/           # routes, menus, endpoints, RBAC scopes
  utils/               # date / error / token / logger helpers (pure, no React)
  helpers/             # JWT decoder
  types/               # ambient types
```

### Conventions

- **Imports:** ordered by `eslint-plugin-import` — builtin → external → internal → parent/sibling/index → type. Run `npm run lint:fix` if you're unsure.
- **Absolute imports:** `tsconfig.json` sets `baseUrl: "src"` — new code can write `import X from 'components/X'` instead of `../../components/X`. Existing relative imports were left in place.
- **Redux:** thunks live in `store/<domain>/api.ts`, reducer + slice in `reducers.ts`, types in `types.ts`. Use `useDispatch<AppDispatch>()` — never accept `dispatch` as a prop.
- **Permissions:** wrap routes with `<PermissionRoute module={ACCESS_SCOPES.x}>` and inline-gate UI with `<PermissionGate>`. Defined in `src/rbac/`.
- **Code-splitting:** heavy routes (Dashboard, Maintenance) are loaded via `React.lazy()` in `App.tsx`. Do not re-export them from `src/pages/index.tsx` — that would defeat the chunking.
- **Errors:** thunks throw via `rejectWithValue(handleApiError(err, fallback))`; components surface them via `react-hot-toast`.

## CI

`.github/workflows/feature-branch-ci.yml` runs on every PR:

- `npm ci`
- ESLint (errors fail the build; warnings are advisory)
- Prettier check
- `tsc --noEmit`

## Known caveats

- **Create React App** (`react-scripts 5.0.1`) is in maintenance mode upstream. A migration to Vite is on the roadmap.
- **JWT + user PII** is currently persisted to `localStorage` via redux-persist. This is an XSS exposure — slated to move to httpOnly cookies or in-memory + silent refresh. See `src/store/persistConfig.ts`.
- **No tests yet.** `@testing-library/*` is installed but `find src -name "*.test.*"` returns zero results. Start with utility + reducer tests.
- **No error monitoring** wired up. `src/utils/logger.ts` has a TODO for the sink.

## Engineering notes

See the engineering audit for the full assessment of code quality, performance, type safety, and security. Critical and quick-win items are tracked in the team backlog.
