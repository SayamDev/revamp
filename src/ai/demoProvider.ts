/**
 * DemoAIProvider — deterministic rules engine.
 *
 * This is what the public demo runs on. It is genuinely analysing the enquiry
 * text and the business data (see `./rules.ts` and `@/analytics/metrics`); it
 * is not replaying canned strings. It is, however, a rules engine and not a
 * language model — the UI labels it "Demo AI" everywhere so nobody is misled.
 */
import type {
  AIProvider,
  AnalystAnswer,
  Briefing,
  BriefingSection,
  BusinessContext,
  EvidenceItem,
  RecommendedAction,
} from './types'
import {
  classify,
  confidenceFor,
  derivePriority,
  estimateValue,
  extractFields,
  scoreCategories,
  urgencyScore,
  SLA_HOURS,
} from './rules'
import type { Enquiry, EnquiryAnalysis, ResponseDraft } from '@/types'
import {
  breachedSla,
  compareWeeks,
  round,
  sortByPriority,
} from '@/analytics/metrics'
import { formatCurrency, formatCurrencyRange, formatDuration } from '@/lib/format'

/** Small artificial latency so loading states are exercised in the demo. */
const think = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const INTENT_BY_CATEGORY: Record<string, string> = {
  sales_enquiry: 'Requesting pricing and availability for a new engagement',
  support_issue: 'Reporting a problem with a live service',
  billing_question: 'Querying an invoice or payment',
  partnership: 'Proposing a commercial partnership',
  recruitment: 'Applying for a role',
  general: 'General contact — intent unclear from the message',
}

function recommendedActionFor(analysis: Omit<EnquiryAnalysis, 'recommendedAction'>): string {
  const sla = SLA_HOURS[analysis.priority]
  switch (analysis.category) {
    case 'sales_enquiry':
      return `Contact within ${sla} hours with an indicative price and a discovery call slot.`
    case 'support_issue':
      return analysis.priority === 'urgent'
        ? 'Escalate to the on-call engineer now and acknowledge the customer within 1 hour.'
        : `Acknowledge within ${sla} hours and assign to support triage.`
    case 'billing_question':
      return `Route to finance and confirm the invoice position within ${sla} hours.`
    case 'partnership':
      return 'Send the partner overview pack and book an introductory call.'
    case 'recruitment':
      return 'Forward to the hiring inbox. No commercial follow-up needed.'
    default:
      return `Reply within ${sla} hours to clarify what the sender needs.`
  }
}

export class DemoAIProvider implements AIProvider {
  readonly id = 'demo'
  readonly label = 'Demo AI'
  readonly mode = 'demo' as const

  private readonly latencyMs: number

  constructor(latencyMs = 650) {
    this.latencyMs = latencyMs
  }

  async isAvailable(): Promise<boolean> {
    return true
  }

  async analyseEnquiry(enquiry: Enquiry, context: BusinessContext): Promise<EnquiryAnalysis> {
    await think(this.latencyMs)

    const text = `${enquiry.subject}\n${enquiry.body}`
    const scores = scoreCategories(text)
    const best = classify(text)
    const extracted = extractFields(text, enquiry.company)
    const urgency = urgencyScore(text)
    const estimatedValue = estimateValue(best.category, extracted)
    const isExistingCustomer =
      enquiry.customerId !== null ||
      context.issues.some((issue) => issue.company === enquiry.company)

    const priority = derivePriority({
      category: best.category,
      urgency: urgency.score,
      estimatedValue,
      employees: extracted.employees,
      isExistingCustomer,
      hasDeadline: extracted.deadline !== null,
    })

    const reasoning: string[] = []
    if (best.matched.length > 0) {
      reasoning.push(`Matched ${best.matched.length} ${best.label.toLowerCase()} signals: ${best.matched.slice(0, 4).join(', ')}.`)
    } else {
      reasoning.push('No strong category signals found — routed as a general enquiry.')
    }
    if (urgency.matched.length > 0) {
      reasoning.push(`Urgency language detected: ${urgency.matched.slice(0, 3).join(', ')}.`)
    }
    if (extracted.employees) {
      reasoning.push(`Company size of ${extracted.employees} staff raises the expected deal band.`)
    }
    if (estimatedValue) {
      reasoning.push(`Estimated value ${formatCurrencyRange(estimatedValue)} from service type and company size.`)
    }
    if (isExistingCustomer) {
      reasoning.push('Sender matches an existing account, which raises priority.')
    }
    if (extracted.deadline) {
      reasoning.push(`A target of ${extracted.deadline} was stated, which adds time pressure.`)
    }

    const base = {
      category: best.category,
      categoryLabel: best.label,
      intent: INTENT_BY_CATEGORY[best.category] ?? INTENT_BY_CATEGORY.general,
      priority,
      confidence: confidenceFor(scores),
      estimatedValue,
      slaHours: SLA_HOURS[priority],
      reasoning,
      extracted,
      providerId: this.id,
      analysedAt: new Date().toISOString(),
    }

    return { ...base, recommendedAction: recommendedActionFor(base) }
  }

  async generateResponse(enquiry: Enquiry, analysis: EnquiryAnalysis): Promise<ResponseDraft> {
    await think(this.latencyMs)

    const firstName = enquiry.senderName.split(' ')[0]
    const { extracted } = analysis
    const tone: ResponseDraft['tone'] =
      analysis.category === 'support_issue' || analysis.category === 'billing_question'
        ? 'apologetic'
        : analysis.category === 'sales_enquiry'
          ? 'consultative'
          : 'professional'

    const lines: string[] = [`Hi ${firstName},`, '']

    if (analysis.category === 'sales_enquiry') {
      lines.push(
        `Thanks for getting in touch about ${extracted.service ? extracted.service.toLowerCase() : 'your project'}${extracted.company ? ` at ${extracted.company}` : ''}. It sounds like a good fit for the work we do.`,
        '',
      )
      const scopeBits: string[] = []
      if (extracted.employees) scopeBits.push(`a team of around ${extracted.employees}`)
      if (extracted.deadline) scopeBits.push(`a target of ${extracted.deadline}`)
      if (scopeBits.length > 0) {
        lines.push(`Based on ${scopeBits.join(' and ')}, here is where we would start:`, '')
      } else {
        lines.push('Here is where we would start:', '')
      }
      if (analysis.estimatedValue) {
        lines.push(
          `• Indicative range: projects of this shape typically land between ${formatCurrency(analysis.estimatedValue.min)} and ${formatCurrency(analysis.estimatedValue.max)}, confirmed after a scoping call.`,
        )
      }
      lines.push(
        '• Next step: a 30-minute discovery call to confirm scope, integrations and success measures.',
        `• Timeline: ${extracted.deadline ? `we can work back from ${extracted.deadline}` : 'we can share an outline schedule after the call'}.`,
        '',
        'Would either of the next two working days suit you for that call?',
      )
    } else if (analysis.category === 'support_issue') {
      lines.push(
        `Thanks for flagging this, and sorry for the disruption. I have logged it as a ${analysis.priority} priority issue and it is with our team now.`,
        '',
        `• What happens next: we are reproducing the problem and will confirm the cause within ${analysis.slaHours} hour${analysis.slaHours === 1 ? '' : 's'}.`,
        '• Updates: I will write to you as soon as we have a fix or a workaround, and again when it is resolved.',
        '',
        'If anything changes at your end in the meantime, reply here and it will reach the same team.',
      )
    } else if (analysis.category === 'billing_question') {
      lines.push(
        'Thanks for raising this — I am sorry for the confusion on the account.',
        '',
        '• I have asked our finance team to pull the invoice and payment history.',
        `• You will have a written answer, and a corrected invoice if one is due, within ${analysis.slaHours} hours.`,
        '',
        'Nothing further is needed from you at this stage.',
      )
    } else if (analysis.category === 'partnership') {
      lines.push(
        'Thanks for reaching out about working together. Partnerships like this are something we actively look at.',
        '',
        'I have attached our partner overview, which covers how we structure referrals and delivery. If it looks like a fit, I can set up a short call to talk through commercials.',
        '',
        'Would some time next week work?',
      )
    } else if (analysis.category === 'recruitment') {
      lines.push(
        'Thanks for your interest and for sending your details across.',
        '',
        'I have passed your application to our hiring team. They review applications weekly and will be in touch if there is a match with a current or upcoming role.',
      )
    } else {
      lines.push(
        'Thanks for getting in touch.',
        '',
        'So that I can point you to the right person, could you tell me a little more about what you are looking for and any timing you have in mind?',
      )
    }

    lines.push('', 'Best regards,', 'Alex Whitmore', 'Northwind Studio')

    return {
      body: lines.join('\n'),
      tone,
      generatedAt: new Date().toISOString(),
      providerId: this.id,
      approved: false,
      edited: false,
    }
  }

  async generateBusinessBriefing(context: BusinessContext): Promise<Briefing> {
    await think(this.latencyMs)

    const comparison = compareWeeks(context.weeks)
    const breached = breachedSla(context.enquiries)
    const openUrgent = context.issues.filter(
      (issue) => issue.status !== 'resolved' && (issue.priority === 'urgent' || issue.priority === 'high'),
    )
    const overdueTasks = context.tasks.filter(
      (task) => task.status !== 'done' && new Date(task.dueAt).getTime() < Date.now(),
    )

    const sections: BriefingSection[] = []

    if (comparison) {
      const leadPct = comparison.leads.percent
      sections.push({
        heading: 'What changed',
        body: `Lead volume is ${comparison.leads.direction === 'down' ? 'down' : 'up'} ${leadPct === null ? '—' : `${Math.abs(round(leadPct))}%`} week on week (${comparison.previous.leads} to ${comparison.current.leads}). Revenue moved from ${formatCurrency(comparison.previous.revenue)} to ${formatCurrency(comparison.current.revenue)}.`,
      })
    } else {
      sections.push({
        heading: 'What changed',
        body: 'Not enough weekly history in the dataset to compare periods.',
      })
    }

    const attention: string[] = []
    if (breached.length > 0) {
      attention.push(
        `${breached.length} enquir${breached.length === 1 ? 'y has' : 'ies have'} passed the response window set by their priority.`,
      )
    }
    if (openUrgent.length > 0) {
      attention.push(`${openUrgent.length} high or urgent support issue${openUrgent.length === 1 ? ' is' : 's are'} still open.`)
    }
    if (overdueTasks.length > 0) {
      attention.push(`${overdueTasks.length} follow-up task${overdueTasks.length === 1 ? ' is' : 's are'} past due.`)
    }
    sections.push({
      heading: 'What needs attention',
      body: attention.length > 0 ? attention.join(' ') : 'Nothing is currently outside its response window.',
    })

    if (comparison?.bestChannel && comparison.bestChannel.change.absolute > 0) {
      sections.push({
        heading: 'Opportunity',
        body: `${comparison.bestChannel.channel} produced ${comparison.bestChannel.change.absolute} more qualified leads than last week — the strongest movement of any channel.`,
      })
    } else {
      const topOpp = [...context.opportunities].sort((a, b) => b.value * b.probability - a.value * a.probability)[0]
      sections.push({
        heading: 'Opportunity',
        body: topOpp
          ? `${topOpp.company} — ${topOpp.name} is the highest weighted deal in the pipeline at ${formatCurrency(topOpp.value)} and ${topOpp.probability}% probability.`
          : 'No open opportunities in the pipeline.',
      })
    }

    const recommendations = (await this.recommendActions(context)).map((action) => action.title)

    return {
      generatedAt: new Date().toISOString(),
      providerId: this.id,
      headline: comparison
        ? `Revenue ${comparison.revenue.direction === 'down' ? 'down' : 'up'} ${comparison.revenue.percent === null ? '—' : `${Math.abs(round(comparison.revenue.percent))}%`} on last week`
        : 'Business overview',
      sections,
      recommendations,
    }
  }

  async recommendActions(context: BusinessContext): Promise<RecommendedAction[]> {
    const actions: RecommendedAction[] = []
    const comparison = compareWeeks(context.weeks)
    const breached = breachedSla(context.enquiries)

    if (breached.length > 0) {
      const value = breached.reduce((total, e) => total + (e.analysis?.estimatedValue?.max ?? 0), 0)
      actions.push({
        id: 'sla',
        title: `Respond to ${breached.length} overdue enquir${breached.length === 1 ? 'y' : 'ies'}${value > 0 ? ` worth up to ${formatCurrency(value)}` : ''}`,
        rationale: 'These have passed the response window their assigned priority sets.',
        priority: 'high',
      })
    }

    if (comparison?.worstChannel && comparison.worstChannel.change.absolute < 0) {
      actions.push({
        id: 'channel',
        title: `Review ${comparison.worstChannel.channel}, down ${Math.abs(comparison.worstChannel.change.absolute)} qualified leads`,
        rationale: 'It is the largest single contributor to the change in qualified lead volume.',
        priority: 'medium',
      })
    }

    const escalated = context.issues.filter((issue) => issue.status === 'escalated')
    if (escalated.length > 0) {
      actions.push({
        id: 'escalations',
        title: `Clear ${escalated.length} escalated support issue${escalated.length === 1 ? '' : 's'}`,
        rationale: `Escalations affect ${new Set(escalated.map((issue) => issue.company)).size} account(s).`,
        priority: 'high',
      })
    }

    const topDeals = [...context.opportunities]
      .filter((opp) => opp.stage === 'negotiation' || opp.stage === 'closing')
      .sort((a, b) => b.value - a.value)
      .slice(0, 2)
    if (topDeals.length > 0) {
      actions.push({
        id: 'deals',
        title: `Push ${topDeals.map((deal) => deal.company).join(' and ')} to close`,
        rationale: `${formatCurrency(topDeals.reduce((total, deal) => total + deal.value, 0))} sitting in late-stage negotiation.`,
        priority: 'medium',
      })
    }

    return actions.slice(0, 4)
  }

  async answerBusinessQuestion(question: string, context: BusinessContext): Promise<AnalystAnswer> {
    await think(this.latencyMs)
    return answerFromRules(question, context, this.id)
  }
}

type Topic = 'revenue' | 'leads' | 'conversion' | 'response_time' | 'issues' | 'pipeline' | 'automation' | 'tasks'

const TOPIC_KEYWORDS: [Topic, string[]][] = [
  ['revenue', ['sales', 'revenue', 'income', 'turnover', 'money', 'closed']],
  ['leads', ['lead', 'enquiries', 'enquiry', 'inbound', 'demand', 'pipeline top', 'channel']],
  ['conversion', ['conversion', 'convert', 'win rate', 'close rate']],
  ['response_time', ['response time', 'respond', 'reply', 'sla', 'slow', 'waiting']],
  ['issues', ['issue', 'support', 'complaint', 'ticket', 'churn risk', 'escalation']],
  ['pipeline', ['pipeline', 'opportunit', 'forecast', 'deal']],
  ['automation', ['automation', 'automated', 'workflow', 'ai action']],
  ['tasks', ['task', 'follow up', 'follow-up', 'overdue']],
]

function detectTopic(question: string): Topic | null {
  const haystack = question.toLowerCase()
  for (const [topic, keywords] of TOPIC_KEYWORDS) {
    if (keywords.some((keyword) => haystack.includes(keyword))) return topic
  }
  return null
}

/**
 * Answers are composed from the same derived metrics the dashboard uses, so
 * the analyst can never contradict the charts. Unrecognised questions return
 * `unsupported: true` rather than inventing an answer.
 */
export function answerFromRules(
  question: string,
  context: BusinessContext,
  providerId: string,
): AnalystAnswer {
  const topic = detectTopic(question)
  const comparison = compareWeeks(context.weeks)
  const answeredAt = new Date().toISOString()

  const unsupported = (reason: string): AnalystAnswer => ({
    question,
    answer: reason,
    driver: null,
    evidence: [],
    recommendation: 'Try asking about revenue, leads, conversion, response times, support issues, pipeline, automation or tasks.',
    confidence: 0,
    providerId,
    answeredAt,
    unsupported: true,
  })

  if (topic === null) {
    return unsupported(
      "That question does not map to any metric in this dataset, so there is nothing reliable to answer it with.",
    )
  }
  if (!comparison && (topic === 'revenue' || topic === 'leads' || topic === 'conversion' || topic === 'response_time')) {
    return unsupported('There is not enough weekly history in the dataset to compare periods.')
  }

  /** Signed, for evidence rows. */
  const pct = (value: number | null) => (value === null ? '—' : `${value > 0 ? '+' : ''}${round(value)}%`)
  /** Unsigned, for sentences that already say "rose" or "fell". */
  const mag = (value: number | null) => (value === null ? '—' : `${Math.abs(round(value))}%`)
  const dir = (d: { direction: 'up' | 'down' | 'flat' }) => d.direction

  switch (topic) {
    case 'revenue': {
      const c = comparison!
      const evidence: EvidenceItem[] = [
        { label: 'Qualified leads', value: pct(c.qualifiedLeads.percent), direction: dir(c.qualifiedLeads) },
        { label: 'Conversion rate', value: pct(c.conversion.percent), direction: dir(c.conversion) },
        { label: 'Average deal value', value: pct(c.avgDealValue.percent), direction: dir(c.avgDealValue) },
        { label: 'Closed deals', value: `${c.current.won} vs ${c.previous.won}`, direction: c.current.won >= c.previous.won ? 'up' : 'down' },
      ]
      const driver =
        Math.abs(c.qualifiedLeads.percent ?? 0) >= Math.abs(c.conversion.percent ?? 0)
          ? `Qualified lead volume ${dir(c.qualifiedLeads) === 'down' ? 'fell' : 'rose'} ${mag(c.qualifiedLeads.percent)}${c.worstChannel && c.worstChannel.change.absolute < 0 ? `, concentrated in ${c.worstChannel.channel}` : ''}.`
          : `Conversion rate ${dir(c.conversion) === 'down' ? 'fell' : 'rose'} ${mag(c.conversion.percent)} while lead volume held.`
      return {
        question,
        answer: `Revenue ${dir(c.revenue) === 'down' ? 'decreased' : 'increased'} ${mag(c.revenue.percent)} against the previous week — ${formatCurrency(c.current.revenue)} versus ${formatCurrency(c.previous.revenue)}.`,
        driver,
        evidence,
        recommendation:
          c.worstChannel && c.worstChannel.change.absolute < 0
            ? `Review ${c.worstChannel.channel} spend and allocation, and personally follow up the largest open opportunities this week.`
            : 'Protect the current mix and focus effort on the largest late-stage opportunities.',
        confidence: 0.82,
        providerId,
        answeredAt,
        unsupported: false,
      }
    }
    case 'leads': {
      const c = comparison!
      const channels = Object.entries(c.current.channelBreakdown)
        .map(([channel, value]) => ({
          label: channel,
          value: `${value} (${pct(((value - (c.previous.channelBreakdown[channel] ?? 0)) / Math.max(c.previous.channelBreakdown[channel] ?? 1, 1)) * 100)})`,
          direction: (value >= (c.previous.channelBreakdown[channel] ?? 0) ? 'up' : 'down') as 'up' | 'down',
        }))
      return {
        question,
        answer: `Lead volume moved from ${c.previous.leads} to ${c.current.leads} (${pct(c.leads.percent)}), with ${c.current.qualifiedLeads} qualifying (${pct(c.qualifiedLeads.percent)}).`,
        driver: c.worstChannel
          ? `${c.worstChannel.change.absolute < 0 ? c.worstChannel.channel : c.bestChannel?.channel ?? c.worstChannel.channel} accounts for the largest single change.`
          : null,
        evidence: channels,
        recommendation:
          c.bestChannel && c.bestChannel.change.absolute > 0
            ? `Shift budget toward ${c.bestChannel.channel} while diagnosing ${c.worstChannel?.channel ?? 'the weaker channels'}.`
            : 'Diagnose the weakest channel before adjusting spend.',
        confidence: 0.79,
        providerId,
        answeredAt,
        unsupported: false,
      }
    }
    case 'conversion': {
      const c = comparison!
      return {
        question,
        answer: `Conversion from qualified lead to won ${dir(c.conversion) === 'down' ? 'fell' : dir(c.conversion) === 'up' ? 'rose' : 'held flat at'} ${mag(c.conversion.percent)} week on week.`,
        driver: `${c.current.won} of ${c.current.qualifiedLeads} qualified leads closed this week, against ${c.previous.won} of ${c.previous.qualifiedLeads} last week.`,
        evidence: [
          { label: 'Qualified leads', value: `${c.current.qualifiedLeads}`, direction: dir(c.qualifiedLeads) },
          { label: 'Deals won', value: `${c.current.won}`, direction: c.current.won >= c.previous.won ? 'up' : 'down' },
          { label: 'Average deal value', value: pct(c.avgDealValue.percent), direction: dir(c.avgDealValue) },
        ],
        recommendation: 'Review lost-reason notes on the deals that did not close and tighten qualification at the top of funnel.',
        confidence: 0.76,
        providerId,
        answeredAt,
        unsupported: false,
      }
    }
    case 'response_time': {
      const c = comparison!
      const breached = breachedSla(context.enquiries)
      return {
        question,
        answer: `Average first response is ${formatDuration(c.current.avgResponseMinutes)}, ${dir(c.responseTime) === 'up' ? 'slower' : 'faster'} than last week's ${formatDuration(c.previous.avgResponseMinutes)}.`,
        driver: breached.length > 0 ? `${breached.length} enquiries are currently past their response window.` : null,
        evidence: [
          { label: 'Average first response', value: formatDuration(c.current.avgResponseMinutes), direction: dir(c.responseTime) },
          { label: 'Enquiries past SLA', value: `${breached.length}` },
          { label: 'Open enquiries', value: `${context.enquiries.filter((e) => e.status !== 'responded' && e.status !== 'archived').length}` },
        ],
        recommendation: breached.length > 0
          ? 'Clear the overdue enquiries first, highest estimated value first.'
          : 'Current response times are inside the windows set by priority.',
        confidence: 0.81,
        providerId,
        answeredAt,
        unsupported: false,
      }
    }
    case 'issues': {
      const open = context.issues.filter((issue) => issue.status !== 'resolved')
      const byCategory = open.reduce<Record<string, number>>((acc, issue) => {
        acc[issue.category] = (acc[issue.category] ?? 0) + 1
        return acc
      }, {})
      const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
      return {
        question,
        answer: `${open.length} support issue${open.length === 1 ? ' is' : 's are'} open, ${open.filter((i) => i.status === 'escalated').length} of them escalated.`,
        driver: top ? `The largest cluster is "${top[0].replace('_', ' ')}" with ${top[1]} open issue(s).` : null,
        evidence: Object.entries(byCategory).map(([category, count]) => ({
          label: category.replace('_', ' '),
          value: `${count}`,
        })),
        recommendation: sortByPriority(open)[0]
          ? `Start with ${sortByPriority(open)[0].company}: ${sortByPriority(open)[0].title}.`
          : 'No open issues to prioritise.',
        confidence: 0.85,
        providerId,
        answeredAt,
        unsupported: false,
      }
    }
    case 'pipeline': {
      const weighted = context.opportunities.reduce((total, opp) => total + opp.value * (opp.probability / 100), 0)
      const raw = context.opportunities.reduce((total, opp) => total + opp.value, 0)
      const late = context.opportunities.filter((opp) => opp.stage === 'negotiation' || opp.stage === 'closing')
      return {
        question,
        answer: `The pipeline holds ${context.opportunities.length} open opportunities worth ${formatCurrency(raw)} gross, ${formatCurrency(weighted)} weighted by probability.`,
        driver: late.length > 0 ? `${late.length} deal(s) worth ${formatCurrency(late.reduce((t, o) => t + o.value, 0))} are in negotiation or closing.` : null,
        evidence: [
          { label: 'Open opportunities', value: `${context.opportunities.length}` },
          { label: 'Gross value', value: formatCurrency(raw) },
          { label: 'Weighted value', value: formatCurrency(weighted) },
          { label: 'Late stage', value: `${late.length}` },
        ],
        recommendation: late.length > 0
          ? `Focus this week on ${[...late].sort((a, b) => b.value - a.value)[0].company}.`
          : 'Move discovery-stage deals to proposal to build late-stage cover.',
        confidence: 0.88,
        providerId,
        answeredAt,
        unsupported: false,
      }
    }
    case 'automation': {
      const runs = context.weeks.reduce((total, week) => total + week.automationRuns, 0)
      const analysed = context.enquiries.filter((e) => e.analysis).length
      return {
        question,
        answer: `${runs} automation runs are recorded across the weeks in this dataset, and ${analysed} of ${context.enquiries.length} enquiries carry an AI analysis.`,
        driver: null,
        evidence: context.weeks.slice(-4).map((week) => ({
          label: week.label,
          value: `${week.automationRuns} runs`,
        })),
        recommendation: 'Extend automation coverage to the enquiry types that are still being handled manually.',
        confidence: 0.9,
        providerId,
        answeredAt,
        unsupported: false,
      }
    }
    case 'tasks': {
      const open = context.tasks.filter((task) => task.status !== 'done')
      const overdue = open.filter((task) => new Date(task.dueAt).getTime() < Date.now())
      return {
        question,
        answer: `${open.length} task${open.length === 1 ? ' is' : 's are'} open, ${overdue.length} past due.`,
        driver: overdue.length > 0 ? `Overdue work is concentrated on ${new Set(overdue.map((t) => t.assignee)).size} assignee(s).` : null,
        evidence: [
          { label: 'Open tasks', value: `${open.length}` },
          { label: 'Overdue', value: `${overdue.length}` },
          { label: 'Created by automation', value: `${context.tasks.filter((t) => t.source.includes('AI') || t.source.includes('automation')).length}` },
        ],
        recommendation: sortByPriority(open)[0] ? `Start with "${sortByPriority(open)[0].title}".` : 'No open tasks.',
        confidence: 0.86,
        providerId,
        answeredAt,
        unsupported: false,
      }
    }
  }
}
