export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        Chargement…
      </div>
    </div>
  )
}
