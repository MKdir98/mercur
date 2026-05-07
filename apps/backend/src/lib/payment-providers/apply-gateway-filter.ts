import {
  parseIranPaymentGatewayKeysFromEnv,
  paymentProviderIdToIranGatewayKey,
} from '../iran-payment-gateways'

type ProviderRow = { id: string; is_enabled?: boolean }

export type PaymentProviderFilterContext = {
  requestQueryRegionId?: string
  storeLockedRegionIdFromEnv?: string | null
}

function shouldLogPaymentProviders(): boolean {
  return process.env.LOG_PAYMENT_PROVIDERS === "true"
}

function skipGatewayFilter(): boolean {
  return process.env.SKIP_PAYMENT_PROVIDER_GATEWAY_FILTER === "true"
}

export function useRemitationFromEnv(): boolean {
  return process.env.USE_REMITATION_PAYMENT_GATEWAY === "true"
}

export function applyGatewayEnvFilter(
  providers: ProviderRow[],
  context?: PaymentProviderFilterContext
): ProviderRow[] {
  if (skipGatewayFilter()) {
    if (shouldLogPaymentProviders()) {
      console.info("[payment-providers] SKIP_PAYMENT_PROVIDER_GATEWAY_FILTER=true", {
        ids: providers.map((p) => p.id),
      })
    }
    return providers
  }

  const useRemitation = useRemitationFromEnv()
  const before = providers.map((p) => p.id)

  const iranGatewayAllowlist = parseIranPaymentGatewayKeysFromEnv()
  const filtered = providers.filter((p) => {
    const id = p.id.toLowerCase()
    const isZarinpal = id.includes("zarinpal")
    const isRemitation = id.includes("remitation")
    if (useRemitation) {
      return !isZarinpal
    }
    if (!isRemitation) {
      const iranKey = paymentProviderIdToIranGatewayKey(p.id)
      if (iranKey && !iranGatewayAllowlist.includes(iranKey)) {
        return false
      }
    }
    return !isRemitation
  })
  console.log(filtered)

  if (shouldLogPaymentProviders()) {
    console.info("[payment-providers]", {
      USE_REMITATION_PAYMENT_GATEWAY: useRemitation,
      SKIP_PAYMENT_PROVIDER_GATEWAY_FILTER: false,
      countBefore: before.length,
      countAfter: filtered.length,
      idsBefore: before,
      idsAfter: filtered.map((p) => p.id),
    })
  }

  if (before.length > 0 && filtered.length === 0) {
    const locked = context?.storeLockedRegionIdFromEnv?.trim() || null
    const reqRegion = context?.requestQueryRegionId
    console.warn(
      "[payment-providers] filter removed all providers; check region links and USE_REMITATION_PAYMENT_GATEWAY or set SKIP_PAYMENT_PROVIDER_GATEWAY_FILTER=true",
      {
        idsBefore: before,
        USE_REMITATION_PAYMENT_GATEWAY: useRemitation,
        requestQueryRegionId: reqRegion,
        storeLockedRegionIdFromEnv: locked,
        requestDiffersFromStoreLock: !!(locked && reqRegion && reqRegion !== locked),
      }
    )
  }

  return filtered
}
