import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ChartLegend, ChartTooltip } from './ChartTooltip'
import { CHART_AXIS } from './chartTokens'
import { pipelineByStage } from '@/analytics/metrics'
import type { Opportunity, WeeklyMetric } from '@/types'
import { formatCurrency } from '@/lib/format'

const SERIES_LABELS = { leads: 'Total leads', qualified: 'Qualified' }

export function LeadsChart({ weeks }: { weeks: WeeklyMetric[] }) {
  const data = weeks.map((week) => ({
    label: week.label,
    leads: week.leads,
    qualified: week.qualifiedLeads,
  }))

  return (
    <Card>
      <CardHeader title="Leads over time" description="Total against qualified, by week." />
      <ChartLegend
        items={[
          { label: 'Total leads', colour: 'var(--color-accent)' },
          { label: 'Qualified', colour: 'var(--color-ink-400)', dashed: true },
        ]}
      />
      <CardBody className="pt-1 pl-1">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-line)" vertical={false} />
              <XAxis dataKey="label" tick={CHART_AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={CHART_AXIS} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                content={<ChartTooltip seriesLabels={SERIES_LABELS} />}
                cursor={{ stroke: 'var(--color-line-strong)' }}
              />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="url(#leadFill)"
              />
              <Area
                type="monotone"
                dataKey="qualified"
                stroke="var(--color-ink-400)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}

export function PipelineChart({ opportunities }: { opportunities: Opportunity[] }) {
  const data = pipelineByStage(opportunities)

  return (
    <Card>
      <CardHeader title="Pipeline by stage" description="Gross opportunity value." />
      <CardBody className="pl-1">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="var(--color-line)" vertical={false} />
              <XAxis dataKey="stage" tick={CHART_AXIS} tickLine={false} axisLine={false} />
              <YAxis
                tick={CHART_AXIS}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(value: number) => `£${Math.round(value / 1000)}k`}
              />
              <Tooltip
                content={<ChartTooltip formatter={formatCurrency} />}
                cursor={{ fill: 'var(--color-raised)' }}
              />
              <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={54} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
