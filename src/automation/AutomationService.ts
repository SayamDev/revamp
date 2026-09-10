/**
 * The seam between the application and whatever executes a workflow.
 *
 * Default adapter is the local engine, so the app is fully functional with no
 * external services. If n8n is configured and reachable it is used instead,
 * and if an n8n run fails mid-demo we fall back to the local engine rather
 * than leaving the user stuck.
 */
import type {
  AutomationAdapter,
  AutomationDefinition,
  AutomationId,
  AutomationInput,
  AutomationResult,
} from './types'
import { AUTOMATIONS } from './definitions'
import { DemoAutomationAdapter } from './demoAdapter'
import { N8nAutomationAdapter } from './n8nAdapter'
import type { AIProvider, BusinessContext } from '@/ai/types'

export interface AutomationRunOutcome extends AutomationResult {
  adapterUsed: 'demo' | 'n8n'
  fellBack: boolean
}

export class AutomationService {
  private readonly local = new DemoAutomationAdapter()

  private readonly remote: AutomationAdapter | null

  constructor(remote: AutomationAdapter | null = null) {
    this.remote = remote
  }

  get adapters(): AutomationAdapter[] {
    return this.remote ? [this.remote, this.local] : [this.local]
  }

  definition(id: AutomationId): AutomationDefinition {
    return AUTOMATIONS[id]
  }

  async run(
    id: AutomationId,
    input: AutomationInput,
    deps: { provider: AIProvider; context: BusinessContext },
  ): Promise<AutomationRunOutcome> {
    const definition = this.definition(id)

    if (this.remote && (await this.remote.isAvailable())) {
      try {
        const result = await this.remote.run(definition, input, deps)
        return { ...result, adapterUsed: this.remote.id, fellBack: false }
      } catch {
        const result = await this.local.run(definition, input, deps)
        return { ...result, adapterUsed: 'demo', fellBack: true }
      }
    }

    const result = await this.local.run(definition, input, deps)
    return { ...result, adapterUsed: 'demo', fellBack: false }
  }
}

const env = import.meta.env

export function createAutomationService(): AutomationService {
  const url = env.VITE_N8N_WEBHOOK_URL
  if (env.VITE_AUTOMATION_ADAPTER === 'n8n' && url) {
    return new AutomationService(new N8nAutomationAdapter(url))
  }
  return new AutomationService(null)
}
