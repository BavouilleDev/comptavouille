export function sumSources(sources) {
  if (!Array.isArray(sources)) return 0
  return sources.reduce((acc, s) => acc + (Number(s?.amount) || 0), 0)
}

export function formatCurrencyEUR(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}

export function formatPercentSigned(value) {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} %`
}
