import { useMemo, useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { motion as Motion } from 'framer-motion'
import { Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { useAppData } from '../providers/useAppData'
import { compareMonthKeys, formatMonthLabelFr } from '../lib/months'
import {
  clampTaxPercentage,
  effectiveMonthTaxPercentage,
} from '../lib/monthTax'
import { formatCurrencyEUR, formatPercentSigned, sumSources } from '../lib/money'

const CHART_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f97316',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#a855f7',
  '#ef4444',
]

function cloneSources(sources) {
  if (!Array.isArray(sources)) return []
  return sources.map((s) => ({
    id: s.id,
    label: s.label ?? '',
    amount: Number(s.amount) || 0,
  }))
}

function MonthSidePanelBody({ monthKey, initialSources, sortedKeysAsc, onClose }) {
  const { monthsById, profile, saveMonthSources, saveMonthTaxPercentage } =
    useAppData()
  const [draftSources, setDraftSources] = useState(() => cloneSources(initialSources))

  const monthDoc = monthKey ? monthsById[monthKey] : null
  const [taxInput, setTaxInput] = useState(() =>
    String(effectiveMonthTaxPercentage(monthDoc, profile)),
  )

  const taxPreview = useMemo(() => {
    const n = Number(String(taxInput).replace(',', '.'))
    if (Number.isFinite(n)) return clampTaxPercentage(n)
    return effectiveMonthTaxPercentage(monthDoc, profile)
  }, [taxInput, monthDoc, profile])

  const total = useMemo(() => sumSources(draftSources), [draftSources])

  const pieData = useMemo(() => {
    return draftSources
      .map((s) => ({
        name: s.label?.trim() ? s.label : 'Sans nom',
        value: Math.max(0, Number(s.amount) || 0),
      }))
      .filter((d) => d.value > 0)
  }, [draftSources])

  const growth = useMemo(() => {
    if (!monthKey) return null
    const keys = [...sortedKeysAsc].sort(compareMonthKeys)
    const idx = keys.indexOf(monthKey)
    if (idx <= 0) return null
    const prevKey = keys[idx - 1]
    const prevTotal = sumSources(monthsById[prevKey]?.sources)
    if (prevTotal === 0) {
      if (total === 0) return 0
      return null
    }
    return ((total - prevTotal) / prevTotal) * 100
  }, [monthKey, monthsById, sortedKeysAsc, total])

  async function persistSources(next) {
    if (!monthKey) return
    setDraftSources(next)
    await saveMonthSources(monthKey, next)
  }

  async function onBlurPersist() {
    if (!monthKey) return
    await saveMonthSources(monthKey, draftSources)
  }

  async function persistTaxPercentage() {
    if (!monthKey) return
    try {
      await saveMonthTaxPercentage(monthKey, taxPreview)
    } catch (e) {
      console.error('[month] saveMonthTaxPercentage', e)
      setTaxInput(String(effectiveMonthTaxPercentage(monthDoc, profile)))
    }
  }

  return (
    <Motion.div
      initial={{ x: 24 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
      className="flex h-full w-full flex-col"
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Détail du mois
          </p>
          <DialogTitle className="mt-1 truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {monthKey ? formatMonthLabelFr(monthKey) : ''}
          </DialogTitle>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Total :{' '}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {formatCurrencyEUR(total)}
            </span>
            <span className="mx-2 text-zinc-400">·</span>
            Urssaf ({taxPreview} %) :{' '}
            <span className="font-medium text-red-600 dark:text-red-400">
              {formatCurrencyEUR(total * (taxPreview / 100))}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onClose(false)}
          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Fermer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <label
            htmlFor={`month-tax-${monthKey}`}
            className="text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Taux Urssaf pour ce mois (%)
          </label>
          <input
            id={`month-tax-${monthKey}`}
            inputMode="decimal"
            value={taxInput}
            onChange={(e) => setTaxInput(e.target.value)}
            onBlur={() => void persistTaxPercentage()}
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-zinc-400/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Indépendant du taux par défaut des réglages ; enregistré au blur.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Évolution vs mois précédent
          </p>
          <div className="mt-2 flex items-center gap-2">
            {growth === null ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">—</p>
            ) : (
              <>
                {growth >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatPercentSigned(growth)} sur le total
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Sources de revenus
            </h3>
            <button
              type="button"
              onClick={async () => {
                const next = [
                  ...draftSources,
                  {
                    id: crypto.randomUUID(),
                    label: 'Nouvelle source',
                    amount: 0,
                  },
                ]
                await persistSources(next)
              }}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Ajouter
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {draftSources.map((s, idx) => (
              <div
                key={s.id}
                className="grid grid-cols-12 gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="col-span-12 sm:col-span-7">
                  <label className="text-[11px] font-medium text-zinc-500">Libellé</label>
                  <input
                    value={s.label}
                    onChange={(e) => {
                      const v = e.target.value
                      setDraftSources((prev) =>
                        prev.map((row) => (row.id === s.id ? { ...row, label: v } : row)),
                      )
                    }}
                    onBlur={onBlurPersist}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </div>
                <div className="col-span-10 sm:col-span-4">
                  <label className="text-[11px] font-medium text-zinc-500">Montant (€)</label>
                  <input
                    inputMode="decimal"
                    value={Number.isFinite(s.amount) ? String(s.amount) : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.')
                      const n = raw === '' ? 0 : Number(raw)
                      setDraftSources((prev) =>
                        prev.map((row) =>
                          row.id === s.id
                            ? { ...row, amount: Number.isFinite(n) ? n : 0 }
                            : row,
                        ),
                      )
                    }}
                    onBlur={onBlurPersist}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-zinc-400/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </div>
                <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const next = draftSources.filter((row) => row.id !== s.id)
                      await persistSources(
                        next.length
                          ? next
                          : [
                              {
                                id: crypto.randomUUID(),
                                label: 'Source',
                                amount: 0,
                              },
                            ],
                      )
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    aria-label={`Supprimer la source ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Répartition</h3>
          <div className="mt-3 h-64 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-600 dark:text-zinc-400">
                Ajoutez des montants pour afficher le camembert.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={86}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={`c-${i}`}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatCurrencyEUR(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </Motion.div>
  )
}

export function MonthSidePanel({ open, monthKey, onClose, sortedKeysAsc }) {
  const { monthsById, profile } = useAppData()
  const monthRow = monthKey ? monthsById[monthKey] : null
  const initialSources = monthRow?.sources
  const sourcesCount = Array.isArray(initialSources) ? initialSources.length : 0
  const hasMonthTax = Number.isFinite(Number(monthRow?.taxPercentage))
  const monthTaxKey = !monthKey
    ? ''
    : hasMonthTax
      ? String(monthRow.taxPercentage)
      : `d:${profile?.taxPercentage ?? ''}`

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm transition-opacity duration-200" />

      <div className="fixed inset-0 flex justify-end">
        <DialogPanel className="flex h-screen w-full max-w-lg border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          {open && monthKey ? (
            <MonthSidePanelBody
              key={`${monthKey}:${sourcesCount}:${monthTaxKey}`}
              monthKey={monthKey}
              initialSources={initialSources}
              sortedKeysAsc={sortedKeysAsc}
              onClose={onClose}
            />
          ) : null}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
