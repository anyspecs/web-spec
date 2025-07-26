/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KIMI_API_KEY: string
  readonly VITE_KIMI_BASE_URL: string
  readonly VITE_KIMI_MODEL: string
  readonly VITE_AIHUBMIX_API_KEY: string
  readonly VITE_AIHUBMIX_BASE_URL: string
  readonly VITE_AIHUBMIX_MODEL: string
  readonly VITE_OPENROUTER_API_KEY: string
  readonly VITE_OPENROUTER_BASE_URL: string
  readonly VITE_OPENROUTER_MODEL: string
  readonly VITE_OPENROUTER_SITE_URL: string
  readonly VITE_OPENROUTER_SITE_NAME: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_MICROSOFT_CLIENT_ID: string
  readonly VITE_GITHUB_CLIENT_ID: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_AUTH_CALLBACK_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DEV_MODE: string
  readonly VITE_DEBUG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}