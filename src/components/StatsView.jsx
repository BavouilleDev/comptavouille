import { useMemo } from 'react'
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
import { formatCurrencyEUR, sumSources } from '../lib/money'

export function StatsView() {
  const { monthsById, profile } = useAppData()

  const sortedKeys = useMemo(() => {
    return Object.keys(monthsById).sort(compareMonthKeys)
  }, [monthsById])

  const totals = useMemo(() => {
    let revenue = 0
    let stolen = 0
    for (const key of sortedKeys) {
      const doc = monthsById[key]
      const t = sumSources(doc?.sources)
      const rate = effectiveMonthTaxPercentage(doc, profile) / 100
      revenue += t
      stolen += t * rate
    }
    return { revenue, stolen }
  }, [monthsById, sortedKeys, profile])

  const chartData = useMemo(() => {
    return sortedKeys.map((key) => {
      const doc = monthsById[key]
      const total = sumSources(doc?.sources)
      return {
        key,
        label: formatMonthLabelFr(key),
        total,
      }
    })
  }, [monthsById, sortedKeys])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Stats</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Vue consolidée sur l’ensemble des mois enregistrés dans Firestore.
        </p>
      </div>

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
            Total « volé » (Urssaf)
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-red-600 dark:text-red-400">
            {formatCurrencyEUR(totals.stolen)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Somme des « Urssaf » mois par mois, chaque mois avec son propre taux
            (réglages = défaut uniquement pour les mois sans taux enregistré).
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Tendance des revenus
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Un point par mois documenté dans la base.
            </p>
          </div>
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
                  formatter={(value) => [formatCurrencyEUR(value), 'Revenus']}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgb(228 228 231)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
