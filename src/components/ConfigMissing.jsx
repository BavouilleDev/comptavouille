export function ConfigMissing({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold tracking-tight">
          Configuration Firebase manquante
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
      </div>
    </div>
  )
}
