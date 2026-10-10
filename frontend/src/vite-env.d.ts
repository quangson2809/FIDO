/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'real' | 'mock';
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_IMAGE_BASE_URL?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_SUPPORT_HOTLINE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
