import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAppData } from '../providers/useAppData'
import { compareMonthKeys, formatMonthLabelFr } from '../lib/months'
import { effectiveMonthTaxPercentage } from '../lib/monthTax'
import { formatCurrencyEUR, sumSources, sumTaxableSources } from '../lib/money'
import { StatsStyleChartInfobox } from './StatsStyleChartInfobox'

function RevenueChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = Number(payload[0]?.value)
  const safe = Number.isFinite(total) ? total : 0
  return (
    <StatsStyleChartInfobox
      eyebrow="Revenus"
      title={label}
      value={formatCurrencyEUR(safe)}
    />
  )
}

const CHART_RANGE_OPTIONS = [
  { value: 'all', label: 'Toutes les périodes' },
  { value: '6', label: '6 derniers mois' },
  { value: '12', label: '12 derniers mois' },
  { value: '24', label: '24 derniers mois' },
]

export function StatsView() {
  const { monthsById, profile } = useAppData()
  const [chartRange, setChartRange] = useState('all')

  const sortedKeys = useMemo(() => {
    return Object.keys(monthsById).sort(compareMonthKeys)
  }, [monthsById])

  /** Mois affichés sur la courbe (les N plus récents parmi les docs existants). */
  const chartKeys = useMemo(() => {
    if (chartRange === 'all') return sortedKeys
    const n = Number(chartRange)
    if (!Number.isFinite(n) || n <= 0) return sortedKeys
    if (sortedKeys.length <= n) return sortedKeys
    return sortedKeys.slice(-n)
  }, [sortedKeys, chartRange])

  const totals = useMemo(() => {
    let revenue = 0
    let stolen = 0
    for (const key of sortedKeys) {
      const doc = monthsById[key]
      const t = sumSources(doc?.sources)
      const taxable = sumTaxableSources(doc?.sources)
      const rate = effectiveMonthTaxPercentage(doc, profile) / 100
      revenue += t
      stolen += taxable * rate
    }
    return { revenue, stolen }
  }, [monthsById, sortedKeys, profile])

  const chartData = useMemo(() => {
    return chartKeys.map((key) => {
      const doc = monthsById[key]
      const total = sumSources(doc?.sources)
      return {
        key,
        label: formatMonthLabelFr(key),
        total,
      }
    })
  }, [monthsById, chartKeys])

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Stats</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Total revenus
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatCurrencyEUR(totals.revenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Total volé
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-red-600 dark:text-red-400">
            {formatCurrencyEUR(totals.stolen)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {`Somme volée par l'Urssaf sur toute la durée de votre entreprise.`}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Tendance des revenus
            </h3>
          </div>
          <label className="flex shrink-0 flex-col gap-1 sm:items-end">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Période
            </span>
            <select
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value)}
              className="w-full min-w-[12rem] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400/30 focus-visible:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 sm:w-auto sm:min-w-[14rem]"
            >
              {CHART_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 h-72">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-600 dark:text-zinc-400">
              Ajoutez des données sur le tableau pour voir la courbe.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-zinc-500"
                  interval="preserveStartEnd"
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-zinc-500"
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
                  }
                />
                <Tooltip
                  content={RevenueChartTooltip}
                  cursor={{ stroke: '#a1a1aa', strokeWidth: 1, strokeDasharray: '4 4' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{
                    r: 5,
                    fill: '#6366f1',
                    stroke: '#6366f1',
                    strokeWidth: 0,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
