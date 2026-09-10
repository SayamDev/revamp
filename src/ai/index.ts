import type { AIProvider } from './types'
import { DemoAIProvider } from './demoProvider'
import { LocalAIProvider } from './ollamaProvider'

export type ProviderKey = 'demo' | 'ollama'

const env = import.meta.env

/**
 * Provider selection lives in exactly one place. The rest of the application
 * depends only on the `AIProvider` interface.
 */
export function createProvider(key: ProviderKey): AIProvider {
  if (key === 'ollama') {
    return new LocalAIProvider(
      env.VITE_OLLAMA_HOST ?? 'http://localhost:11434',
      env.VITE_OLLAMA_MODEL ?? 'llama3.2',
    )
  }
  return new DemoAIProvider()
}

export const defaultProviderKey: ProviderKey =
  env.VITE_AI_PROVIDER === 'ollama' ? 'ollama' : 'demo'

export { DemoAIProvider, LocalAIProvider }
export type { AIProvider }
