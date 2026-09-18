interface ImportMetaEnv {
  readonly VITE_ENVIRONMENT_NAME?: string
  readonly VITE_API_DEV_SERVER?: string
  readonly VITE_ADDITIONAL_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
