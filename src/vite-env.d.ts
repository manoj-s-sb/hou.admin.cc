/// <reference types="vite/client" />

// Typed access to our env vars (kept on the CRA-era `REACT_APP_` prefix).
interface ImportMetaEnv {
  readonly REACT_APP_API_BASE_URL: string;
  readonly REACT_APP_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
