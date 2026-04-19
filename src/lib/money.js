import { sanitizeDecimalInput } from './decimalInput.js'

/** Interprète une saisie / collage (€, %, espaces, milliers) en nombre ≥ 0. */
export function parseAmountInput(raw) {
  const s = sanitizeDecimalInput(raw)
  if (s === '' || s === ',' || s === '.') return 0
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function sumSources(sources) {
  if (!Array.isArray(sources)) return 0
  return sources.reduce((acc, s) => acc + (Number(s?.amount) || 0), 0)
}

export function formatCurrencyEUR(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

/** Montants dans un CSV (point décimal, 2 décimales). */
export function formatDecimal2ForCsv(value) {
  const n = Number(value)
  return (Number.isFinite(n) ? n : 0).toFixed(2)
}

export function formatPercentSigned(value) {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} %`
}
