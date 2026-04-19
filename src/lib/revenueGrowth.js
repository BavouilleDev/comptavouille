import { sumSources } from './money'

/**
 * Variation % des revenus du mois courant vs le mois calendaire précédent dans `sortedKeysAsc`.
 * Retourne `null` si non calculable (pas de mois précédent, ou mois précédent sans revenu de référence : évite ÷0 et « infini »).
 */
export function revenueGrowthPercentVsPrevMonth(
  sortedKeysAsc,
  monthsById,
  monthKey,
  currentTotal,
) {
  const idx = sortedKeysAsc.indexOf(monthKey)
  if (idx <= 0) return null
  const prevKey = sortedKeysAsc[idx - 1]
  const prevTotal = sumSources(monthsById[prevKey]?.sources)
  const cur = Number(currentTotal) || 0

  if (!Number.isFinite(prevTotal) || prevTotal <= 0) {
    return null
  }

  const pct = ((cur - prevTotal) / prevTotal) * 100
  return Number.isFinite(pct) ? pct : null
}
