/** @param {string} key YYYY-MM */
export function parseMonthKey(key) {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  return { year: y, month: m, date: new Date(y, m - 1, 1) }
}

/** @param {Date} d */
export function toMonthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function currentMonthKey() {
  return toMonthKey(new Date())
}

/** @param {string} key YYYY-MM */
export function formatMonthLabelFr(key) {
  const parsed = parseMonthKey(key)
  if (!parsed) return key
  const raw = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(parsed.date)
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

/** Last `count` calendar months ending at `anchor` (inclusive), newest first */
export function rollingMonthKeys(anchor = new Date(), count = 12) {
  const keys = []
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  for (let i = 0; i < count; i++) {
    keys.push(toMonthKey(d))
    d.setMonth(d.getMonth() - 1)
  }
  return keys
}

/** Sort YYYY-MM ascending */
export function compareMonthKeys(a, b) {
  return a.localeCompare(b)
}
