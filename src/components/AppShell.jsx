import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Settings,
} from 'lucide-react'
import { FirestoreRulesBanner } from './FirestoreRulesBanner'
import { useAppData } from '../providers/useAppData'

const tabs = [
  { id: 'dashboard', label: 'Tableau', icon: LayoutDashboard },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Réglages', icon: Settings },
]

export function AppShell({ active, onChange, children }) {
  const { signOut, sessionUser, firestorePermissionDenied } = useAppData()

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-zinc-50/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              CV
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                Comptavouille
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {sessionUser?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden items-center rounded-full border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex">
              {tabs.map((t) => {
                const Icon = t.icon
                const selected = active === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange(t.id)}
                    className={[
                      'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition',
                      selected
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {t.label}
                  </button>
                )
              })}
            </nav>

            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:hidden">
          {tabs.map((t) => {
            const Icon = t.icon
            const selected = active === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(t.id)}
                className={[
                  'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  selected
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {t.label}
              </button>
            )
          })}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {firestorePermissionDenied ? <FirestoreRulesBanner /> : null}
        {children}
      </main>
    </div>
  )
}
