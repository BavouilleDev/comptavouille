import { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { Download, Moon, Sun, Trash2 } from 'lucide-react'
import { useAppData } from '../providers/useAppData'
import { rowsToCsv, downloadTextFile } from '../lib/csv'
import { compareMonthKeys, formatMonthLabelFr } from '../lib/months'
import { effectiveMonthTaxPercentage } from '../lib/monthTax'
import { sumSources } from '../lib/money'
import { nukeUserAccount } from '../lib/accountActions'

function buildCsvRows(monthsById, profile) {
  const header = [
    'month_key',
    'month_label',
    'declared',
    'source_label',
    'source_amount_eur',
    'month_total_eur',
    'urssaf_eur',
    'tax_percent',
  ]
  const rows = [header]
  const keys = Object.keys(monthsById).sort(compareMonthKeys)
  for (const key of keys) {
    const m = monthsById[key]
    const tax = effectiveMonthTaxPercentage(m, profile)
    const sources = Array.isArray(m?.sources) ? m.sources : []
    const total = sumSources(sources)
    const urssaf = total * (tax / 100)
    const labelFr = formatMonthLabelFr(key)
    const declared = m?.isDeclared ? 'yes' : 'no'
    if (sources.length === 0) {
      rows.push([key, labelFr, declared, '', '', String(total), String(urssaf), String(tax)])
      continue
    }
    for (const s of sources) {
      rows.push([
        key,
        labelFr,
        declared,
        s.label ?? '',
        String(s.amount ?? 0),
        String(total),
        String(urssaf),
        String(tax),
      ])
    }
  }
  return rows
}

function ProfileBasicsCard({
  profile,
  updateUserProfile,
  busy,
  setBusy,
  setMessage,
}) {
  const taxPct = Number(profile?.taxPercentage)
  const safeTax = Number.isFinite(taxPct) ? taxPct : 22

  const [taxInput, setTaxInput] = useState(() => String(safeTax))
  const [sourcesText, setSourcesText] = useState(() =>
    Array.isArray(profile?.defaultRevenueSources)
      ? profile.defaultRevenueSources.join('\n')
      : '',
  )

  async function saveBasics() {
    setMessage('')
    setBusy(true)
    try {
      const nextTax = Number(String(taxInput).replace(',', '.'))
      const lines = sourcesText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      await updateUserProfile({
        taxPercentage: Number.isFinite(nextTax) ? nextTax : 22,
        defaultRevenueSources: lines.length ? lines : ['Prestation Client A', 'Ventes'],
      })
      setMessage('Enregistré.')
    } catch (e) {
      setMessage(e?.message ?? 'Impossible d’enregistrer.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Fiscalité</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Taux par défaut pour les <span className="font-medium">nouveaux</span> mois
        uniquement. Chaque mois existant garde son propre % (modifiable dans le
        détail du mois).
      </p>

      <label className="mt-4 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Pourcentage (%)
      </label>
      <input
        value={taxInput}
        onChange={(e) => setTaxInput(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
      />

      <label className="mt-4 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Sources par défaut (une par ligne)
      </label>
      <textarea
        value={sourcesText}
        onChange={(e) => setSourcesText(e.target.value)}
        rows={6}
        className="mt-1 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
      />

      <button
        type="button"
        disabled={busy}
        onClick={saveBasics}
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        Enregistrer
      </button>
    </div>
  )
}

export function SettingsView() {
  const {
    profile,
    monthsById,
    updateUserProfile,
    sessionUser,
    auth,
    db,
  } = useAppData()

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [nukeOpen, setNukeOpen] = useState(false)
  const [nukeConfirm, setNukeConfirm] = useState('')

  const profileBasicsKey = `${profile?.taxPercentage ?? ''}|${(profile?.defaultRevenueSources ?? []).join('¦')}`

  async function setTheme(next) {
    setMessage('')
    try {
      await updateUserProfile({ theme: next })
    } catch (e) {
      setMessage(e?.message ?? 'Impossible de changer le thème.')
    }
  }

  function exportCsv() {
    const rows = buildCsvRows(monthsById, profile)
    const csv = rowsToCsv(rows)
    downloadTextFile(`comptavouille-export-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  async function nuke() {
    if (!auth || !db || !sessionUser) return
    setMessage('')
    setBusy(true)
    try {
      await nukeUserAccount({ db, user: sessionUser })
    } catch (e) {
      const code = e?.code
      if (code === 'auth/requires-recent-login') {
        setMessage(
          'Firebase exige une reconnexion récente pour supprimer le compte. Déconnectez-vous, reconnectez-vous, puis réessayez.',
        )
      } else {
        setMessage(e?.message ?? 'Échec de la suppression du compte.')
      }
    } finally {
      setBusy(false)
      setNukeOpen(false)
      setNukeConfirm('')
    }
  }

  const theme = profile?.theme === 'light' ? 'light' : 'dark'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Réglages</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Paramètres du profil, export CSV, et zone sensible.
        </p>
      </div>

      {message ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileBasicsCard
          key={profileBasicsKey}
          profile={profile}
          updateUserProfile={updateUserProfile}
          busy={busy}
          setBusy={setBusy}
          setMessage={setMessage}
        />

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Apparence
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Stocké dans Firestore et appliqué automatiquement.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={[
                  'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                  theme === 'dark'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900',
                ].join(' ')}
              >
                <Moon className="h-4 w-4" aria-hidden />
                Sombre
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={[
                  'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                  theme === 'light'
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900',
                ].join(' ')}
              >
                <Sun className="h-4 w-4" aria-hidden />
                Clair
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Portabilité
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Exporte vos mois et vos lignes de sources au format CSV.
            </p>
            <button
              type="button"
              onClick={exportCsv}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              <Download className="h-4 w-4" aria-hidden />
              Exporter CSV
            </button>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/30">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
              Zone dangereuse
            </h3>
            <p className="mt-1 text-xs text-red-900/80 dark:text-red-200/80">
              Supprime les documents du mois, le profil Firestore, et le compte
              d’authentification.
            </p>
            <button
              type="button"
              onClick={() => setNukeOpen(true)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Nuke Account
            </button>
          </div>
        </div>
      </div>

      <Dialog open={nukeOpen} onClose={() => setNukeOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Confirmer la suppression définitive
            </DialogTitle>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Tapez <span className="font-mono font-semibold">DELETE</span> pour confirmer.
              Cette action est irréversible.
            </p>
            <input
              value={nukeConfirm}
              onChange={(e) => setNukeConfirm(e.target.value)}
              className="mt-4 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              autoComplete="off"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNukeOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busy || nukeConfirm !== 'DELETE'}
                onClick={nuke}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Supprimer tout
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}
