/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATEWAY_ORIGIN: string;
  readonly VITE_TENANT_ID: string;
  readonly VITE_JWT_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
