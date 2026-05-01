export function defaultSourcesFromProfile(profile) {
  const labels =
    Array.isArray(profile?.defaultRevenueSources) &&
    profile.defaultRevenueSources.length > 0
      ? profile.defaultRevenueSources
      : ['Prestation Client A', 'Ventes']
  return labels.map((label) => ({
    id: crypto.randomUUID(),
    label: String(label),
    amount: 0,
    taxable: true,
  }))
}
