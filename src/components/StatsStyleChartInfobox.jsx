/**
 * Infobulle graphiques (Stats + détail mois) — même coquille visuelle.
 */
export function StatsStyleChartInfobox({ eyebrow, title, value }) {
  return (
    <div
      className={[
        'pointer-events-none min-w-[10.5rem] rounded-xl border px-3.5 py-2.5 shadow-xl',
        'border-zinc-200 bg-white text-zinc-900 ring-1 ring-zinc-950/[0.04]',
        'dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/10',
      ].join(' ')}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
        {eyebrow}
      </p>
      <p className="mt-1 text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </p>
      <p className="mt-2 border-t border-zinc-200 pt-2 text-base font-bold tabular-nums tracking-tight text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
        {value}
      </p>
    </div>
  )
}
