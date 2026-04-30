export function getExtraShippingCountryCodes(): Set<string> {
  const raw = process.env.STORE_EXTRA_SHIPPING_COUNTRY_CODES?.trim()
  if (!raw) {
    return new Set()
  }
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  )
}

export function shouldAllowExtraShippingCountry(
  countryCode: string | undefined | null
): boolean {
  if (!countryCode) {
    return false
  }
  return getExtraShippingCountryCodes().has(countryCode.trim().toLowerCase())
}
