/**
 * Demo dataset for Northwind Studio — a fictional digital product agency.
 *
 * EVERY name, company, figure and message in this file is invented. No real
 * person or organisation is represented and no real customer data is used.
 *
 * The dataset is generated relative to "now" so timestamps always look current
 * in a demo, and it is fully deterministic for a given clock: the same seed
 * produces the same leads, opportunities and metrics every time.
 */
import type {
  Activity,
  Customer,
  Enquiry,
  Lead,
  Opportunity,
  SupportIssue,
  Task,
  WeeklyMetric,
} from '@/types'

export interface SeedData {
  customers: Customer[]
  enquiries: Enquiry[]
  leads: Lead[]
  opportunities: Opportunity[]
  issues: SupportIssue[]
  tasks: Task[]
  activities: Activity[]
  weeks: WeeklyMetric[]
}

/** Deterministic pseudo-random source, so the demo never shifts under you. */
function lcg(seed: number) {
  let state = seed
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return state / 4_294_967_296
  }
}

const pick = <T,>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)]

const minutesAgo = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()
const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()
const hoursFrom = (now: Date, hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString()

const COMPANY_STEMS = [
  'Hartley', 'Bramwell', 'Kestrel', 'Fenwick', 'Ashgrove', 'Calder', 'Moorside',
  'Westbrook', 'Lyndhurst', 'Tarrant', 'Beaumont', 'Ridgeway', 'Halloway', 'Pemberton',
  'Wraysbury', 'Ellesmere', 'Thornbury', 'Marchmont', 'Sowerby', 'Danforth', 'Ingleby',
  'Ravensworth', 'Whitcombe', 'Aldbourne', 'Kingsmead', 'Stanhope', 'Glenholm', 'Cawthorne',
]
const COMPANY_SUFFIXES = ['Ltd', 'Group', 'Partners', 'Holdings', 'Retail', 'Logistics', 'Health', 'Foods', 'Energy', 'Interiors']
const CHANNELS = ['Paid search', 'Referral', 'Organic', 'Outbound', 'Events'] as const
const SOURCES = ['Website form', 'Referral from partner', 'LinkedIn campaign', 'Conference follow-up', 'Cold outreach reply']
const FIRST_NAMES = ['Priya', 'Marcus', 'Elena', 'Tomasz', 'Aisha', 'Callum', 'Nadia', 'Ruben', 'Harriet', 'Oscar', 'Leah', 'Dominic']
const LAST_NAMES = ['Raman', 'Okafor', 'Vasquez', 'Nowak', 'Bello', 'Sinclair', 'Haddad', 'Costa', 'Fairweather', 'Lindqvist', 'Duncan', 'Attah']

const OWNERS = ['Priya Raman', 'Tom Beckett', 'Dana Fowler', 'Alex Whitmore']

function buildLeads(now: Date): Lead[] {
  const random = lcg(20_260_910)
  const leads: Lead[] = []

  // 18 live leads, 9 won and 40 lost — a 18.4% decided-conversion rate.
  const plan: { stage: Lead['stage']; count: number; maxAgeDays: number }[] = [
    { stage: 'new', count: 11, maxAgeDays: 6 },
    { stage: 'qualified', count: 7, maxAgeDays: 14 },
    { stage: 'proposal', count: 6, maxAgeDays: 25 },
    { stage: 'won', count: 9, maxAgeDays: 70 },
    { stage: 'lost', count: 40, maxAgeDays: 90 },
  ]

  let index = 0
  for (const { stage, count, maxAgeDays } of plan) {
    for (let i = 0; i < count; i += 1) {
      index += 1
      const company = `${COMPANY_STEMS[index % COMPANY_STEMS.length]} ${pick(random, COMPANY_SUFFIXES)}`
      leads.push({
        id: `lead_${index}`,
        company,
        contactName: `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`,
        source: pick(random, SOURCES),
        channel: pick(random, CHANNELS),
        value: Math.round((4000 + random() * 26_000) / 500) * 500,
        stage,
        createdAt: daysAgo(now, Math.round(random() * maxAgeDays)),
      })
    }
  }
  return leads
}

function buildOpportunities(now: Date): Opportunity[] {
  const random = lcg(77_412)
  const stages: Opportunity['stage'][] = ['discovery', 'proposal', 'negotiation', 'closing']
  const names = [
    'Website redesign', 'E-commerce replatform', 'Customer portal', 'Design system',
    'Booking flow rebuild', 'Mobile companion app', 'Support retainer', 'Data dashboard',
    'Brand refresh', 'Checkout optimisation', 'Intranet rebuild', 'Accessibility programme',
  ]
  return Array.from({ length: 31 }, (_, i) => {
    const stage = stages[i % stages.length]
    const probability = stage === 'discovery' ? 20 : stage === 'proposal' ? 40 : stage === 'negotiation' ? 65 : 85
    return {
      id: `opp_${i + 1}`,
      company: `${COMPANY_STEMS[(i * 3) % COMPANY_STEMS.length]} ${COMPANY_SUFFIXES[i % COMPANY_SUFFIXES.length]}`,
      name: names[i % names.length],
      value: Math.round((6000 + random() * 34_000) / 500) * 500,
      stage,
      probability,
      owner: OWNERS[i % OWNERS.length],
      closeDate: new Date(now.getTime() + (7 + i * 2) * 86_400_000).toISOString(),
    }
  })
}

function buildWeeks(now: Date): WeeklyMetric[] {
  const random = lcg(5_150_224)
  const weeks: WeeklyMetric[] = []

  // Six generated weeks of history, then two hand-set weeks so the analyst
  // demo ("why did sales drop this week?") has a real, explainable story.
  for (let i = 7; i >= 2; i -= 1) {
    const leads = 34 + Math.round(random() * 12)
    const qualified = Math.round(leads * (0.55 + random() * 0.1))
    const won = Math.max(2, Math.round(qualified * (0.16 + random() * 0.08)))
    weeks.push({
      weekStart: daysAgo(now, i * 7),
      label: `Week -${i}`,
      leads,
      qualifiedLeads: qualified,
      won,
      revenue: won * (10_000 + Math.round(random() * 4000)),
      issues: 3 + Math.round(random() * 4),
      automationRuns: 22 + Math.round(random() * 14),
      avgResponseMinutes: 80 + Math.round(random() * 50),
      channelBreakdown: {
        'Paid search': Math.round(qualified * 0.32),
        Referral: Math.round(qualified * 0.26),
        Organic: Math.round(qualified * 0.2),
        Outbound: Math.round(qualified * 0.14),
        Events: qualified - Math.round(qualified * 0.32) - Math.round(qualified * 0.26) - Math.round(qualified * 0.2) - Math.round(qualified * 0.14),
      },
    })
  }

  weeks.push({
    weekStart: daysAgo(now, 14),
    label: 'Last week',
    leads: 42,
    qualifiedLeads: 27,
    won: 5,
    revenue: 62_000,
    issues: 6,
    automationRuns: 31,
    avgResponseMinutes: 96,
    channelBreakdown: { 'Paid search': 9, Referral: 7, Organic: 5, Outbound: 4, Events: 2 },
  })

  weeks.push({
    weekStart: daysAgo(now, 7),
    label: 'This week',
    leads: 52,
    qualifiedLeads: 21,
    won: 4,
    revenue: 53_320,
    issues: 7,
    automationRuns: 38,
    avgResponseMinutes: 142,
    channelBreakdown: { 'Paid search': 5, Referral: 6, Organic: 7, Outbound: 2, Events: 1 },
  })

  return weeks
}

function buildCustomers(now: Date): Customer[] {
  return [
    { id: 'cus_1', company: 'Marlow Health Ltd', contactName: 'Dr Yasmin Farrell', email: 'y.farrell@marlowhealth.example', industry: 'Healthcare', employees: 320, since: daysAgo(now, 640), lifetimeValue: 148_000 },
    { id: 'cus_2', company: 'Bexley Foods Group', contactName: 'Iain Docherty', email: 'i.docherty@bexleyfoods.example', industry: 'Food & drink', employees: 1180, since: daysAgo(now, 410), lifetimeValue: 96_500 },
    { id: 'cus_3', company: 'Southbank Interiors', contactName: 'Rosa Klein', email: 'rosa@southbankinteriors.example', industry: 'Retail', employees: 64, since: daysAgo(now, 220), lifetimeValue: 41_200 },
    { id: 'cus_4', company: 'Trenton Logistics', contactName: 'Femi Adeyemi', email: 'f.adeyemi@trentonlogistics.example', industry: 'Logistics', employees: 470, since: daysAgo(now, 880), lifetimeValue: 212_000 },
    { id: 'cus_5', company: 'Quill & Ward Partners', contactName: 'Beatrice Ward', email: 'b.ward@quillward.example', industry: 'Professional services', employees: 95, since: daysAgo(now, 150), lifetimeValue: 28_400 },
  ]
}

function buildEnquiries(now: Date): Enquiry[] {
  return [
    {
      id: 'enq_1',
      customerId: null,
      senderName: 'Helen Mbeki',
      senderEmail: 'h.mbeki@abcltd.example',
      company: 'ABC Ltd',
      subject: 'Website redesign — request for pricing',
      body:
        "Hi,\n\nWe're looking for help redesigning our website. We have around 150 employees and would ideally like the work completed before October. Our current site is eight years old and the checkout journey in particular is causing us problems.\n\nCould someone get back to us with an idea of pricing and what a project like this usually involves?\n\nThanks,\nHelen Mbeki\nOperations Director, ABC Ltd",
      receivedAt: minutesAgo(now, 26),
      status: 'new',
      channel: 'web_form',
      analysis: null,
      draft: null,
    },
    {
      id: 'enq_2',
      customerId: 'cus_4',
      senderName: 'Femi Adeyemi',
      senderEmail: 'f.adeyemi@trentonlogistics.example',
      company: 'Trenton Logistics',
      subject: 'URGENT — tracking portal is down for all depots',
      body:
        "The tracking portal has been returning a 503 error since about 06:40 this morning. None of our depot staff can look up consignments, and we have drivers waiting. This is a production outage for us and it is costing us money by the hour.\n\nPlease escalate immediately and confirm who is working on it.\n\nFemi Adeyemi\nHead of Operations",
      receivedAt: minutesAgo(now, 310),
      status: 'new',
      channel: 'email',
      analysis: null,
      draft: null,
    },
    {
      id: 'enq_3',
      customerId: 'cus_2',
      senderName: 'Iain Docherty',
      senderEmail: 'i.docherty@bexleyfoods.example',
      company: 'Bexley Foods Group',
      subject: 'Query on invoice INV-2291',
      body:
        "Morning,\n\nWe've received invoice INV-2291 and it appears we have been overcharged for the support retainer — it shows two months where I believe only one was agreed. Could someone in billing check this and send a corrected invoice if needed? Our purchase order reference is PO-88410.\n\nThanks,\nIain",
      receivedAt: minutesAgo(now, 95),
      status: 'new',
      channel: 'email',
      analysis: null,
      draft: null,
    },
    {
      id: 'enq_4',
      customerId: null,
      senderName: 'Sanjay Kulkarni',
      senderEmail: 's.kulkarni@varndellretail.example',
      company: 'Varndell Retail Ltd',
      subject: 'E-commerce replatform — budget approx £40,000',
      body:
        "Hello,\n\nWe are planning to replatform our online store before Q4. We're a retailer with around 600 staff across 40 sites and we have a budget of approximately £40,000 signed off for the build.\n\nWe'd like a proposal covering discovery, build and the migration of roughly 9,000 products. Are you able to take this on, and what would your timeline look like?\n\nRegards,\nSanjay Kulkarni\nDigital Director",
      receivedAt: minutesAgo(now, 640),
      status: 'new',
      channel: 'web_form',
      analysis: null,
      draft: null,
    },
    {
      id: 'enq_5',
      customerId: null,
      senderName: 'Claire Dunmore',
      senderEmail: 'claire.dunmore@northgate-agency.example',
      company: 'Northgate Agency',
      subject: 'Partnership / white label enquiry',
      body:
        "Hi there,\n\nWe're a marketing agency in Leeds and we regularly get asked for build work we don't do in house. We'd be interested in exploring a referral or white label partnership.\n\nWould you be open to a conversation about how that might work commercially?\n\nClaire Dunmore",
      receivedAt: daysAgo(now, 1),
      status: 'new',
      channel: 'email',
      analysis: null,
      draft: null,
    },
    {
      id: 'enq_6',
      customerId: 'cus_3',
      senderName: 'Rosa Klein',
      senderEmail: 'rosa@southbankinteriors.example',
      company: 'Southbank Interiors',
      subject: 'Search on the product pages is not working',
      body:
        "Since Friday the search box on our product pages returns no results for anything with an ampersand in the name. It's not urgent enough to take the site down over, but it is a bug and customers have noticed.\n\nCan someone take a look this week?\n\nRosa",
      receivedAt: daysAgo(now, 2),
      status: 'new',
      channel: 'web_form',
      analysis: null,
      draft: null,
    },
    {
      id: 'enq_7',
      customerId: null,
      senderName: 'Dominic Attah',
      senderEmail: 'd.attah@example.com',
      company: 'Independent',
      subject: 'Application for the front-end developer role',
      body:
        "Good afternoon,\n\nI'd like to apply for the front-end developer vacancy advertised on your site. I've attached my CV and a link to my portfolio. I have four years of experience with React and design systems.\n\nMany thanks,\nDominic Attah",
      receivedAt: daysAgo(now, 3),
      status: 'new',
      channel: 'email',
      analysis: null,
      draft: null,
    },
    {
      id: 'enq_8',
      customerId: 'cus_1',
      senderName: 'Dr Yasmin Farrell',
      senderEmail: 'y.farrell@marlowhealth.example',
      company: 'Marlow Health Ltd',
      subject: 'Accessibility audit and remediation — 320 staff',
      body:
        "Hello Alex,\n\nFollowing our board review we need an accessibility audit of the patient portal and a remediation plan. We have around 320 employees and the portal is used by roughly 40,000 patients.\n\nThis needs to be scoped before December as it forms part of a compliance commitment. Could you put together an indicative cost?\n\nBest wishes,\nYasmin",
      receivedAt: daysAgo(now, 4),
      status: 'new',
      channel: 'email',
      analysis: null,
      draft: null,
    },
  ]
}

function buildIssues(now: Date): SupportIssue[] {
  return [
    { id: 'iss_1', customerId: 'cus_4', company: 'Trenton Logistics', title: 'Tracking portal returning 503 across all depots', category: 'outage', priority: 'urgent', status: 'escalated', openedAt: minutesAgo(now, 305), resolvedAt: null, firstResponseMinutes: 18 },
    { id: 'iss_2', customerId: 'cus_3', company: 'Southbank Interiors', title: 'Product search fails on names containing "&"', category: 'bug', priority: 'medium', status: 'open', openedAt: daysAgo(now, 2), resolvedAt: null, firstResponseMinutes: 240 },
    { id: 'iss_3', customerId: 'cus_2', company: 'Bexley Foods Group', title: 'Duplicate line on support retainer invoice', category: 'billing', priority: 'medium', status: 'open', openedAt: minutesAgo(now, 90), resolvedAt: null, firstResponseMinutes: null },
    { id: 'iss_4', customerId: 'cus_1', company: 'Marlow Health Ltd', title: 'Patient export times out above 20,000 rows', category: 'data', priority: 'high', status: 'escalated', openedAt: daysAgo(now, 1), resolvedAt: null, firstResponseMinutes: 55 },
    { id: 'iss_5', customerId: 'cus_5', company: 'Quill & Ward Partners', title: 'How do we add a second admin user?', category: 'how_to', priority: 'low', status: 'open', openedAt: daysAgo(now, 3), resolvedAt: null, firstResponseMinutes: 180 },
    { id: 'iss_6', customerId: 'cus_2', company: 'Bexley Foods Group', title: 'Stock feed lagging by roughly 40 minutes', category: 'bug', priority: 'high', status: 'open', openedAt: daysAgo(now, 2), resolvedAt: null, firstResponseMinutes: 65 },
    { id: 'iss_7', customerId: 'cus_1', company: 'Marlow Health Ltd', title: 'Appointment reminders not sending to one clinic', category: 'bug', priority: 'medium', status: 'open', openedAt: daysAgo(now, 4), resolvedAt: null, firstResponseMinutes: 130 },
    { id: 'iss_8', customerId: 'cus_5', company: 'Quill & Ward Partners', title: 'Password reset email landing in spam', category: 'bug', priority: 'low', status: 'resolved', openedAt: daysAgo(now, 9), resolvedAt: daysAgo(now, 7), firstResponseMinutes: 95 },
  ]
}

function buildTasks(now: Date): Task[] {
  return [
    { id: 'task_1', title: 'Confirm fix window with Trenton Logistics', detail: 'Outage on the tracking portal. Account owner expects a written update.', priority: 'urgent', assignee: 'Tom Beckett', dueAt: hoursFrom(now, 1), source: 'AI complaint analysis', status: 'open', linkedEnquiryId: null, createdAt: minutesAgo(now, 290), completedAt: null },
    { id: 'task_2', title: 'Send accessibility audit scope to Marlow Health', detail: 'Board-level compliance commitment; needs indicative cost before December.', priority: 'high', assignee: 'Priya Raman', dueAt: hoursFrom(now, 6), source: 'AI enquiry analysis', status: 'open', linkedEnquiryId: 'enq_8', createdAt: daysAgo(now, 1), completedAt: null },
    { id: 'task_3', title: 'Correct invoice INV-2291 for Bexley Foods', detail: 'Duplicate retainer line to be credited against PO-88410.', priority: 'medium', assignee: 'Dana Fowler', dueAt: hoursFrom(now, 20), source: 'AI enquiry analysis', status: 'in_progress', linkedEnquiryId: 'enq_3', createdAt: minutesAgo(now, 80), completedAt: null },
    { id: 'task_4', title: 'Review paid search allocation', detail: 'Qualified leads from paid search fell from 9 to 5 week on week.', priority: 'high', assignee: 'Alex Whitmore', dueAt: hoursFrom(now, -3), source: 'Daily CEO briefing', status: 'open', linkedEnquiryId: null, createdAt: daysAgo(now, 1), completedAt: null },
    { id: 'task_5', title: 'Chase Varndell Retail proposal', detail: '£40,000 replatform, budget already signed off.', priority: 'high', assignee: 'Priya Raman', dueAt: hoursFrom(now, 30), source: 'Pipeline review', status: 'open', linkedEnquiryId: 'enq_4', createdAt: daysAgo(now, 1), completedAt: null },
    { id: 'task_6', title: 'Publish weekly ops summary', detail: 'Circulate the briefing to the leadership channel.', priority: 'low', assignee: 'Alex Whitmore', dueAt: hoursFrom(now, 48), source: 'Daily CEO briefing', status: 'done', linkedEnquiryId: null, createdAt: daysAgo(now, 2), completedAt: daysAgo(now, 1) },
    { id: 'task_7', title: 'Triage Southbank Interiors search bug', detail: 'Ampersand handling in the product search index.', priority: 'medium', assignee: 'Support triage', dueAt: hoursFrom(now, 26), source: 'AI complaint analysis', status: 'open', linkedEnquiryId: 'enq_6', createdAt: daysAgo(now, 2), completedAt: null },
  ]
}

function buildActivities(now: Date): Activity[] {
  const entries: Omit<Activity, 'id'>[] = [
    { at: minutesAgo(now, 305), kind: 'enquiry_received', actor: 'system', message: 'Support complaint received from Trenton Logistics', detail: 'Tracking portal returning 503 across all depots' },
    { at: minutesAgo(now, 304), kind: 'ai_analysis', actor: 'ai', message: 'AI classified the complaint as URGENT', detail: 'Outage language and production impact detected' },
    { at: minutesAgo(now, 303), kind: 'issue_escalated', actor: 'automation', message: 'Issue escalated to on-call engineering' },
    { at: minutesAgo(now, 302), kind: 'task_created', actor: 'automation', message: 'Escalation task created: Confirm fix window with Trenton Logistics' },
    { at: minutesAgo(now, 290), kind: 'automation_run', actor: 'automation', message: 'Customer complaint automation completed', detail: '5 steps, 0 failures' },
    { at: minutesAgo(now, 95), kind: 'enquiry_received', actor: 'system', message: 'Billing query received from Bexley Foods Group', detail: 'Invoice INV-2291' },
    { at: minutesAgo(now, 94), kind: 'ai_analysis', actor: 'ai', message: 'AI classified the enquiry as a billing question', detail: 'Priority MEDIUM, respond within 24h' },
    { at: minutesAgo(now, 93), kind: 'task_created', actor: 'automation', message: 'Follow-up task created: Correct invoice INV-2291 for Bexley Foods' },
    { at: minutesAgo(now, 60), kind: 'automation_run', actor: 'automation', message: 'Daily CEO briefing generated', detail: 'Revenue down 14% on last week' },
    { at: minutesAgo(now, 45), kind: 'task_completed', actor: 'human', message: 'Task completed: Publish weekly ops summary', detail: 'Completed by Alex Whitmore' },
    { at: minutesAgo(now, 26), kind: 'enquiry_received', actor: 'system', message: 'New enquiry received from ABC Ltd', detail: 'Website redesign — request for pricing' },
  ]
  return entries
    .map((entry, index) => ({ ...entry, id: `act_seed_${index + 1}` }))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

export function createSeedData(now: Date = new Date()): SeedData {
  return {
    customers: buildCustomers(now),
    enquiries: buildEnquiries(now),
    leads: buildLeads(now),
    opportunities: buildOpportunities(now),
    issues: buildIssues(now),
    tasks: buildTasks(now),
    activities: buildActivities(now),
    weeks: buildWeeks(now),
  }
}
