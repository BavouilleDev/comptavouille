import { useMemo, useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { Plus } from 'lucide-react'
import { useAppData } from '../providers/useAppData'
import {
  compareMonthKeys,
  currentMonthKey,
  formatMonthLabelFr,
  monthKeyFromYearMonth,
} from '../lib/months'
import { effectiveMonthTaxPercentage } from '../lib/monthTax'
import { formatCurrencyEUR, formatPercentSigned, sumSources } from '../lib/money'
import { revenueGrowthPercentVsPrevMonth } from '../lib/revenueGrowth'
import { MonthSidePanel } from './MonthSidePanel'

const PAGE_SIZE = 30

const MONTH_OPTIONS_FR = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
]

export function Dashboard() {
  const { profile, monthsById, setMonthDeclared, ensureMonthDoc } = useAppData()
  const [selectedKey, setSelectedKey] = useState(null)
  /** Indice de page (0-based) si plus de {PAGE_SIZE} mois. */
  const [tablePage, setTablePage] = useState(0)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [pickYear, setPickYear] = useState(() => new Date().getFullYear())
  const [pickMonth, setPickMonth] = useState(() => new Date().getMonth() + 1)
  const [addBusy, setAddBusy] = useState(false)

  const rowKeys = useMemo(() => {
    const s = new Set([currentMonthKey(), ...Object.keys(monthsById)])
    return Array.from(s).sort(compareMonthKeys).reverse()
  }, [monthsById])

  const sortedKeysAsc = useMemo(() => {
    const s = new Set([currentMonthKey(), ...Object.keys(monthsById)])
    return Array.from(s).sort(compareMonthKeys)
  }, [monthsById])

  const pageCount = Math.max(1, Math.ceil(rowKeys.length / PAGE_SIZE))
  const validPage = Math.min(tablePage, pageCount - 1)
  const pagedRowKeys =
    rowKeys.length <= PAGE_SIZE
      ? rowKeys
      : rowKeys.slice(validPage * PAGE_SIZE, validPage * PAGE_SIZE + PAGE_SIZE)

  const yearChoices = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 16 }, (_, i) => y - 6 + i)
  }, [])

  function openAddMonthDialog() {
    const d = new Date()
    setPickYear(d.getFullYear())
    setPickMonth(d.getMonth() + 1)
    setAddDialogOpen(true)
  }

  async function confirmAddMonth() {
    const key = monthKeyFromYearMonth(pickYear, pickMonth)
    if (!key) return
    setAddBusy(true)
    try {
      await ensureMonthDoc(key)
      setSelectedKey(key)
      setAddDialogOpen(false)
    } catch (e) {
      console.error('[dashboard] confirmAddMonth', e)
    } finally {
      setAddBusy(false)
    }
  }

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
      <div>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Vos revenus</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Suivi mensuel de vos revenus
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 sm:px-5">
          <div className="col-span-3 sm:col-span-2">Mois</div>
          <div className="col-span-1 sm:col-span-2">Déclaré</div>
          <div className="col-span-2 sm:col-span-2 text-right">Revenus</div>
          <div className="col-span-2 sm:col-span-2 text-right">vs mois préc.</div>
          <div className="col-span-2 sm:col-span-2 text-right">Volé par l’Urssaf</div>
          <div className="col-span-2 sm:col-span-2 text-right">Revenu net</div>
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {pagedRowKeys.map((monthKey) => {
            const doc = monthsById[monthKey]
            const sources = Array.isArray(doc?.sources) ? doc.sources : []
            const total = doc ? sumSources(sources) : 0
            const rowTax = effectiveMonthTaxPercentage(doc, profile)
            const stolen = total * (rowTax / 100)
            const net = total - stolen
            const declared = Boolean(doc?.isDeclared)
            const isLive = monthKey === nowKey
            const growthPct = revenueGrowthPercentVsPrevMonth(
              sortedKeysAsc,
              monthsById,
              monthKey,
              total,
            )

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
                ].join(' ')}
              >
                <div className="col-span-3 flex items-center gap-2 sm:col-span-2">
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
                  className="col-span-1 flex items-center sm:col-span-2"
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
                    className="h-4 w-4 shrink-0 rounded border-zinc-400 bg-white accent-zinc-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-zinc-500 dark:bg-zinc-950 dark:accent-zinc-400 dark:focus-visible:ring-zinc-500/45 dark:focus-visible:ring-offset-zinc-900"
                    aria-label={`Déclaré pour ${formatMonthLabelFr(monthKey)}`}
                  />
                </div>

                <div className="col-span-2 flex items-center justify-end sm:col-span-2">
                  <span className="text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatCurrencyEUR(total)}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-end sm:col-span-2">
                  {growthPct === null ? (
                    <span className="text-sm tabular-nums text-zinc-400 dark:text-zinc-500">
                      —
                    </span>
                  ) : (
                    <span
                      className={[
                        'text-sm tabular-nums font-medium',
                        growthPct > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : growthPct < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-zinc-500 dark:text-zinc-400',
                      ].join(' ')}
                    >
                      {formatPercentSigned(growthPct)}
                    </span>
                  )}
                </div>

                <div className="col-span-2 flex items-center justify-end pr-2 sm:pr-5 sm:col-span-2">
                  <span className="text-sm tabular-nums text-red-600 dark:text-red-400">
                    {formatCurrencyEUR(stolen)}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-end sm:col-span-2">
                  <span className="text-sm tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrencyEUR(net)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {rowKeys.length > PAGE_SIZE ? (
          <div className="flex flex-col items-stretch justify-between gap-3 border-t border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50 sm:flex-row sm:items-center sm:px-5">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {rowKeys.length} mois au total · affichage{' '}
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {validPage * PAGE_SIZE + 1}
                {' – '}
                {Math.min((validPage + 1) * PAGE_SIZE, rowKeys.length)}
              </span>
            </p>
            <label className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <span>Page</span>
              <select
                value={validPage}
                onChange={(e) => setTablePage(Number(e.target.value))}
                className="min-w-[10rem] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400/30 focus-visible:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {Array.from({ length: pageCount }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1} / {pageCount}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className="border-t border-zinc-200 bg-zinc-50/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:px-5">
          <button
            type="button"
            onClick={openAddMonthDialog}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80 sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter un mois
          </button>
        </div>
      </div>

      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        transition
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm transition duration-200 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-[closed]:translate-y-3 data-[closed]:scale-[0.97] data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Ajouter un mois
            </DialogTitle>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="add-month-year"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Année
                </label>
                <select
                  id="add-month-year"
                  value={pickYear}
                  onChange={(e) => setPickYear(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400/30 focus-visible:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {yearChoices.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="add-month-month"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Mois
                </label>
                <select
                  id="add-month-month"
                  value={pickMonth}
                  onChange={(e) => setPickMonth(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400/30 focus-visible:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {MONTH_OPTIONS_FR.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddDialogOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={addBusy}
                onClick={() => void confirmAddMonth()}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                {addBusy ? 'Création…' : 'Créer et ouvrir'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <MonthSidePanel
        open={Boolean(selectedKey)}
        monthKey={selectedKey}
        onClose={() => setSelectedKey(null)}
        sortedKeysAsc={sortedKeysAsc}
      />
    </div>
  )
}
