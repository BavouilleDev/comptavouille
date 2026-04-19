export { sanitizeDecimalInput as sanitizeTaxRateInput } from './decimalInput.js'

/** Taux par défaut issu du profil (réglages). */
export function defaultTaxPercentage(profile) {
  const n = Number(profile?.taxPercentage)
  return Number.isFinite(n) ? n : 22
}

/**
 * Taux appliqué à un mois : valeur sur le doc mois si présente,
 * sinon profil (rétrocompatibilité avant champ `taxPercentage` sur les mois).
 */
export function effectiveMonthTaxPercentage(monthDoc, profile) {
  const onMonth = Number(monthDoc?.taxPercentage)
  if (Number.isFinite(onMonth)) return onMonth
  return defaultTaxPercentage(profile)
}

export function clampTaxPercentage(n) {
  if (!Number.isFinite(n)) return 22
  return Math.min(100, Math.max(0, n))
}
