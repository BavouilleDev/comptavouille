/**
 * Retire espaces (y compris fines / insécables), symboles monnaie et % courants.
 */
function stripDecorators(s) {
  let t = String(s ?? '')
    .trim()
    .replace(/[\s\u00A0\u202F\u2007]+/g, '')
  t = t.replace(/€|\$|%|£|\u20AC/gu, '')
  t = t.replace(/EUR|USD|GBP/gi, '')
  return t
}

/**
 * Si les deux `.` et `,` sont présents, garde le dernier comme décimal
 * et enlève l’autre comme séparateur de milliers (collage type 1.234,56 ou 1,234.56).
 */
function normalizeThousandsSeparators(t) {
  const d = t.replace(/[^\d.,]/g, '')
  const lastComma = d.lastIndexOf(',')
  const lastDot = d.lastIndexOf('.')
  if (lastComma === -1 || lastDot === -1) return d
  if (lastComma > lastDot) return d.replace(/\./g, '').replace(',', '.')
  return d.replace(/,/g, '')
}

/**
 * Ne garde que les chiffres et au plus un séparateur décimal (`.` ou `,`).
 */
function keepDigitsAndOneSep(d) {
  let out = ''
  let sepSeen = false
  for (let i = 0; i < d.length; i++) {
    const c = d[i]
    if (c >= '0' && c <= '9') {
      out += c
      continue
    }
    if ((c === '.' || c === ',') && !sepSeen) {
      sepSeen = true
      out += c
    }
  }
  return out
}

/**
 * Chaîne prête pour un champ montant ou % : chiffres + un séparateur décimal,
 * après nettoyage des symboles (€, %, EUR…) et des milliers.
 */
export function sanitizeDecimalInput(raw) {
  let t = stripDecorators(raw)
  t = normalizeThousandsSeparators(t)
  return keepDigitsAndOneSep(t)
}
