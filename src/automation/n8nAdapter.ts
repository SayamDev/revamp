/**
 * n8n adapter — optional.
 *
 * Posts the trigger payload to a local n8n webhook and expects the workflow to
 * return the same `AutomationEffect[]` shape the local engine produces, so the
 * rest of Revamp behaves identically either way. The bundled workflow export in
 * `n8n/new-enquiry-workflow.json` does exactly that.
 *
 * If n8n is not running, `AutomationService` falls back to the local engine.
 */
import type {
  AutomationAdapter,
  AutomationDefinition,
  AutomationEffect,
  AutomationInput,
  AutomationResult,
} from './types'
import { AutomationError } from './types'
import type { AIProvider, BusinessContext } from '@/ai/types'
import type { AutomationRunRecord } from '@/types'
import { createId } from '@/lib/id'

interface N8nResponse {
  steps?: AutomationRunRecord['steps']
  effects?: AutomationEffect[]
}

const REQUEST_TIMEOUT_MS = 20_000

export class N8nAutomationAdapter implements AutomationAdapter {
  readonly id = 'n8n' as const
  readonly label = 'n8n workflow'

  private readonly webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  /**
   * Configuration, not reachability. A pre-flight probe would cost an extra
   * round trip and cannot be done reliably cross-origin, so we attempt the run
   * and let `AutomationService` fall back to the local engine if it fails.
   */
  async isAvailable(): Promise<boolean> {
    return Boolean(this.webhookUrl)
  }

  async run(
    definition: AutomationDefinition,
    input: AutomationInput,
    _deps: { provider: AIProvider; context: BusinessContext },
  ): Promise<AutomationResult> {
    void _deps
    const startedAt = Date.now()
    if (!this.webhookUrl) throw new AutomationError('No n8n webhook URL configured')

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({ automationId: definition.id, input }),
    })

    if (!response.ok) throw new AutomationError(`n8n responded ${response.status}`)

    const data = (await response.json()) as N8nResponse
    if (!Array.isArray(data.effects)) {
      throw new AutomationError('n8n workflow did not return an effects array')
    }

    return {
      record: {
        id: createId('run'),
        automationId: definition.id,
        at: new Date().toISOString(),
        status: 'success',
        adapter: this.id,
        steps: data.steps ?? definition.steps.map((step) => ({
          name: step.name,
          status: 'success' as const,
          detail: 'Executed in n8n',
        })),
        durationMs: Date.now() - startedAt,
      },
      effects: data.effects,
    }
  }
}
