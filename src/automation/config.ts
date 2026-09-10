/**
 * Whether an n8n webhook is configured for this build. Reading it here rather
 * than in a component keeps the value out of fast-refresh boundaries and gives
 * the UI one place to ask.
 */
export const N8N_CONFIGURED = Boolean(import.meta.env.VITE_N8N_WEBHOOK_URL)
