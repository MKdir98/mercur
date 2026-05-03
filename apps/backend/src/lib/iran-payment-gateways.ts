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
  if (x.includes('zarinpal-gateway')) {
    return 'zarinpal'
  }
  if (x.includes('sep-gateway')) {
    return 'sep'
  }
  if (x.includes('parsian-gateway')) {
    return 'parsian'
  }
  return null
}
