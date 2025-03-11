/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASR_SERVICE_URL: string;
  readonly VITE_OLLAMA_SERVICE_URL: string;
  readonly VITE_OLLAMA_MODEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}