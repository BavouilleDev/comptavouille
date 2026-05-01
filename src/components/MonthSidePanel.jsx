import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { useAppData } from '../providers/useAppData'
import { formatMonthLabelFr } from '../lib/months'
import { revenueGrowthPercentVsPrevMonth } from '../lib/revenueGrowth'
import {
  clampTaxPercentage,
  effectiveMonthTaxPercentage,
  sanitizeTaxRateInput,
} from '../lib/monthTax'
import {
  formatCurrencyEUR,
  formatPercentSigned,
  parseAmountInput,
  sumSources,
  sumTaxableSources,
} from '../lib/money'
import { StatsStyleChartInfobox } from './StatsStyleChartInfobox'

/** Camembert : palette indigo / cyan / violet, saturée juste ce qu’il faut pour un rendu actuel. */
const PIE_SLICE_COLORS = [
  '#6366f1',
  '#0d9488',
  '#7c3aed',
  '#0891b2',
  '#4f46e5',
  '#db2777',
  '#0ea5e9',
  '#65a30d',
]

function PieDistributionTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]
  const name = row?.name != null ? String(row.name) : 'Sans nom'
  const n = Number(row?.value)
  const safe = Number.isFinite(n) ? n : 0
  return (
    <StatsStyleChartInfobox
      eyebrow="Répartition"
      title={name}
      value={formatCurrencyEUR(safe)}
    />
  )
}

function cloneSources(sources) {
  if (!Array.isArray(sources)) return []
  return sources.map((s) => ({
    id: s.id,
    label: s.label ?? '',
    amount: Number(s.amount) || 0,
    taxable: s?.taxable !== false,
  }))
}

function MonthSidePanelBody({ monthKey, initialSources, sortedKeysAsc, onClose }) {
  const { monthsById, profile, saveMonthSources, saveMonthTaxPercentage, deleteMonthDoc } =
    useAppData()
  const [draftSources, setDraftSources] = useState(() => cloneSources(initialSources))

  const monthDoc = monthKey ? monthsById[monthKey] : null
  const [taxInput, setTaxInput] = useState(() =>
    String(effectiveMonthTaxPercentage(monthDoc, profile)),
  )
  /** Dernière source ajoutée : entrée animée (évite d’animer tout le panneau à l’ouverture). */
  const [latestAddedId, setLatestAddedId] = useState(null)

  useEffect(() => {
    if (!latestAddedId) return
    const t = window.setTimeout(() => setLatestAddedId(null), 900)
    return () => window.clearTimeout(t)
  }, [latestAddedId])

  const taxPreview = useMemo(() => {
    const n = Number(String(taxInput).replace(',', '.'))
    if (Number.isFinite(n)) return clampTaxPercentage(n)
    return effectiveMonthTaxPercentage(monthDoc, profile)
  }, [taxInput, monthDoc, profile])

  const total = useMemo(() => sumSources(draftSources), [draftSources])
  const taxableTotal = useMemo(() => sumTaxableSources(draftSources), [draftSources])

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
    return revenueGrowthPercentVsPrevMonth(
      sortedKeysAsc,
      monthsById,
      monthKey,
      total,
    )
  }, [monthKey, monthsById, sortedKeysAsc, total])

  async function persistSources(next) {
    if (!monthKey) return
    setDraftSources(next)
    await saveMonthSources(monthKey, next)
  }

  function persistSourcesSoft(next) {
    if (!monthKey) return
    setDraftSources(next)
    void saveMonthSources(monthKey, next)
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
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
              {formatCurrencyEUR(taxableTotal * (taxPreview / 100))}
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
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <label
            htmlFor={`month-tax-${monthKey}`}
            className="text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Taux Urssaf pour ce mois (%)
          </label>
          <input
            id={`month-tax-${monthKey}`}
            inputMode="decimal"
            autoComplete="off"
            value={taxInput}
            onChange={(e) => setTaxInput(sanitizeTaxRateInput(e.target.value))}
            onBlur={() => void persistTaxPercentage()}
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-zinc-400/30 focus-visible:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Indépendant du taux par défaut des réglages
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
                const id = crypto.randomUUID()
                setLatestAddedId(id)
                const next = [
                  ...draftSources,
                  {
                    id,
                    label: 'Nouvelle source',
                    amount: 0,
                    taxable: true,
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

          <div className="mt-3 flex flex-col gap-2">
            <AnimatePresence initial={false} mode="popLayout">
              {draftSources.map((s, idx) => (
                <Motion.div
                  key={s.id}
                  layout
                  initial={
                    s.id === latestAddedId
                      ? { opacity: 0, y: 16, scale: 0.96 }
                      : false
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    x: -14,
                    scale: 0.98,
                    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 28,
                    mass: 0.85,
                  }}
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
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400/30 focus-visible:ring-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </div>
                <div className="col-span-10 sm:col-span-4">
                  <label className="text-[11px] font-medium text-zinc-500">Montant (€)</label>
                  <input
                    inputMode="decimal"
                    value={Number.isFinite(s.amount) ? String(s.amount) : ''}
                    onChange={(e) => {
                      const n = parseAmountInput(e.target.value)
                      setDraftSources((prev) =>
                        prev.map((row) =>
                          row.id === s.id ? { ...row, amount: n } : row,
                        ),
                      )
                    }}
                    onBlur={onBlurPersist}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-zinc-400/30 focus-visible:ring-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                  <label className="mt-2 flex select-none items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={s.taxable === false}
                      onChange={(e) => {
                        const nonTaxable = e.target.checked
                        const next = draftSources.map((row) =>
                          row.id === s.id ? { ...row, taxable: !nonTaxable } : row,
                        )
                        persistSourcesSoft(next)
                      }}
                      className="h-4 w-4 rounded border-zinc-300 bg-white accent-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:accent-zinc-100"
                    />
                    Non imposable
                  </label>
                </div>
                <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const next = draftSources.filter((row) => row.id !== s.id)
                      if (next.length === 0) {
                        const id = crypto.randomUUID()
                        setLatestAddedId(id)
                        await persistSources([
                          { id, label: 'Source', amount: 0, taxable: true },
                        ])
                      } else {
                        await persistSources(next)
                      }
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    aria-label={`Supprimer la source ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                </Motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Répartition</h3>
          <div className="mt-3 h-64 rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-zinc-50/95 to-white p-4 shadow-sm ring-1 ring-zinc-950/[0.03] dark:border-zinc-800 dark:from-zinc-900/70 dark:to-zinc-950 dark:ring-white/[0.04]">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-600 dark:text-zinc-400">
                Ajoutez des montants pour afficher le camembert.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={2.8}
                    cornerRadius={5}
                    stroke="none"
                    strokeWidth={0}
                    rootTabIndex={-1}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={`c-${i}`}
                        fill={PIE_SLICE_COLORS[i % PIE_SLICE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={PieDistributionTooltip}
                    wrapperStyle={{ outline: 'none' }}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/25">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-red-900/80 dark:text-red-200/80">
                Zone dangereuse
              </p>
              <p className="mt-1 text-sm font-semibold text-red-900 dark:text-red-100">
                Supprimer ce mois
              </p>
              <p className="mt-2 text-xs text-red-900/80 dark:text-red-200/80">
                Supprime toutes les données de ce mois (sources, taux du mois, déclaré).
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!monthKey) return
                const ok = window.confirm(
                  `Supprimer ${formatMonthLabelFr(monthKey)} ? Cette action est irréversible.`,
                )
                if (!ok) return
                try {
                  await deleteMonthDoc(monthKey)
                  onClose(false)
                } catch (e) {
                  console.error('[month] deleteMonthDoc', e)
                }
              }}
              className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
            >
              Supprimer
            </button>
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
  const hasMonthTax = Number.isFinite(Number(monthRow?.taxPercentage))
  const monthTaxKey = !monthKey
    ? ''
    : hasMonthTax
      ? String(monthRow.taxPercentage)
      : `d:${profile?.taxPercentage ?? ''}`

  return (
    <Dialog open={open} onClose={onClose} transition className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm transition duration-300 ease-out data-[closed]:opacity-0"
      />

      <div className="fixed inset-0 flex justify-end">
        <DialogPanel
          transition
          className="flex h-screen w-full max-w-lg border-l border-zinc-200 bg-white shadow-2xl transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[closed]:translate-x-full data-[closed]:opacity-0 dark:border-zinc-800 dark:bg-zinc-950"
        >
          {open && monthKey ? (
            <MonthSidePanelBody
              key={`${monthKey}:${monthTaxKey}`}
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
