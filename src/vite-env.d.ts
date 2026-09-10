/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_PROVIDER?: 'demo' | 'ollama'
  readonly VITE_OLLAMA_HOST?: string
  readonly VITE_OLLAMA_MODEL?: string
  readonly VITE_AUTOMATION_ADAPTER?: 'demo' | 'n8n'
  readonly VITE_N8N_WEBHOOK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
