/// <reference types="vite/client" />

// Where staff sign in to ucode (.env.example); public ids, not secrets.
interface ImportMetaEnv {
   readonly VITE_UCODE_PROJECT_ID?: string;
   readonly VITE_UCODE_ENVIRONMENT_ID?: string;
   readonly VITE_UCODE_CLIENT_TYPE_IDS?: string; // comma-separated, tried in order
}

interface ImportMeta {
   readonly env: ImportMetaEnv;
}
