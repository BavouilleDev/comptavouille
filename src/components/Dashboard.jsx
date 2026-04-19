import { useMemo, useState } from 'react'
import { useAppData } from '../providers/useAppData'
import {
  compareMonthKeys,
  currentMonthKey,
  formatMonthLabelFr,
  rollingMonthKeys,
} from '../lib/months'
import { effectiveMonthTaxPercentage } from '../lib/monthTax'
import { formatCurrencyEUR, sumSources } from '../lib/money'
import { MonthSidePanel } from './MonthSidePanel'

const FILTERS = [
  { id: 6, label: '6 mois' },
  { id: 12, label: '12 mois' },
  { id: 24, label: '24 mois' },
]

export function Dashboard() {
  const { profile, monthsById, setMonthDeclared, ensureMonthDoc } = useAppData()
  const [windowMonths, setWindowMonths] = useState(12)
  const [selectedKey, setSelectedKey] = useState(null)

  const keys = useMemo(() => {
    const base = rollingMonthKeys(new Date(), windowMonths)
    return base
  }, [windowMonths])

  const sortedKeysAsc = useMemo(() => {
    const all = new Set([...Object.keys(monthsById), ...keys])
    return Array.from(all).sort(compareMonthKeys)
  }, [monthsById, keys])

  const nowKey = currentMonthKey()

  async function onRowActivate(monthKey) {
    try {
      await ensureMonthDoc(monthKey)
      setSelectedKey(monthKey)
    } catch (e) {
      console.error('[dashboard] ensureMonthDoc', e)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Anti-Urssaf
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Suivi mensuel en temps réel. Les montants sont stockés dans Firestore
            et se mettent à jour instantanément.
          </p>
        </div>

        <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {FILTERS.map((f) => {
            const active = windowMonths === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setWindowMonths(f.id)}
                className={[
                  'rounded-full px-3 py-1.5 text-xs font-medium transition',
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                ].join(' ')}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 sm:px-5">
          <div className="col-span-4 sm:col-span-3">Mois</div>
          <div className="col-span-3 sm:col-span-2">Déclaré</div>
          <div className="col-span-3 sm:col-span-3 text-right">Revenus</div>
          <div className="col-span-2 sm:col-span-4 text-right">Volé par l’Urssaf</div>
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {keys.map((monthKey) => {
            const doc = monthsById[monthKey]
            const sources = Array.isArray(doc?.sources) ? doc.sources : []
            const total = doc ? sumSources(sources) : 0
            const rowTax = effectiveMonthTaxPercentage(doc, profile)
            const stolen = total * (rowTax / 100)
            const declared = Boolean(doc?.isDeclared)
            const isLive = monthKey === nowKey

            return (
              <div
                key={monthKey}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    void onRowActivate(monthKey)
                  }
                }}
                onClick={() => void onRowActivate(monthKey)}
                className={[
                  'grid w-full cursor-pointer grid-cols-12 gap-2 px-4 py-3 text-left transition sm:px-5',
                  'hover:bg-zinc-50 dark:hover:bg-zinc-800/40',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60 dark:focus-visible:ring-zinc-600/60',
                  isLive ? 'live-row bg-red-500/5' : '',
                ].join(' ')}
              >
                <div className="col-span-4 flex items-center gap-2 sm:col-span-3">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {formatMonthLabelFr(monthKey)}
                  </span>
                  {isLive ? (
                    <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Live
                    </span>
                  ) : null}
                </div>

                <div
                  className="col-span-3 flex items-center sm:col-span-2"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={declared}
                    onChange={async (e) => {
                      e.stopPropagation()
                      const next = e.target.checked
                      try {
                        await setMonthDeclared(monthKey, next)
                      } catch (err) {
                        console.error('[dashboard] setMonthDeclared', err)
                        e.target.checked = !next
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:focus:ring-zinc-600"
                    aria-label={`Déclaré pour ${formatMonthLabelFr(monthKey)}`}
                  />
                </div>

                <div className="col-span-3 flex items-center justify-end sm:col-span-3">
                  <span className="text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatCurrencyEUR(total)}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-end sm:col-span-4">
                  <span className="text-sm tabular-nums text-red-600 dark:text-red-400">
                    {formatCurrencyEUR(stolen)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <MonthSidePanel
        open={Boolean(selectedKey)}
        monthKey={selectedKey}
        onClose={() => setSelectedKey(null)}
        sortedKeysAsc={sortedKeysAsc}
      />
    </div>
  )
}
