/** Allowlist for storefront payment-provider listing only; does not control Medusa registration. */
export function parseIranPaymentGatewayKeysFromEnv(): string[] {
  const raw = process.env.IRAN_PAYMENT_GATEWAY_PROVIDERS?.trim()
  if (!raw) {
    return ['zarinpal']
  }
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function paymentProviderIdToIranGatewayKey(id: string): string | null {
  const x = id.toLowerCase()
  console.log(x)
  if (x.includes('pp_zarinpal-gateway_zarinpal')) {
    return 'zarinpal'
  }
  if (x.includes('pp_parsian-gateway_parsian')) {
    return 'parsian'
  }
  if (x.includes('pp_sep-gateway_sep')) {
    return 'sep'
  }
  return null
}
