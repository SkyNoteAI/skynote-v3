/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_API_BASE_PATH: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_ENABLE_DEVTOOLS: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_ENABLE_AI_CHAT: string
  readonly VITE_ENABLE_SEMANTIC_SEARCH: string
  readonly VITE_ENABLE_RELATED_NOTES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}