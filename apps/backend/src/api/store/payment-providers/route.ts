import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { applyGatewayEnvFilter } from "../../../lib/payment-providers/apply-gateway-filter"
import { filterProvidersByFeatureAccess } from "../../../lib/feature-access/has-feature-access"

function shouldLogPaymentRegion(): boolean {
  return (
    process.env.LOG_PAYMENT_REGION === "true" ||
    process.env.LOG_PAYMENT_PROVIDERS === "true"
  )
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const regionId =
    req.filterableFields?.region_id ??
    (req.query as { region_id?: string }).region_id

  if (!regionId || typeof regionId !== "string") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "You must provide the region_id to list payment providers"
    )
  }

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  if (shouldLogPaymentRegion()) {
    const locked = process.env.STORE_LOCKED_REGION_ID?.trim() ?? null
    let regionSnapshot: Record<string, unknown> | null = null
    try {
      const regionQuery = remoteQueryObjectFromString({
        entryPoint: "region",
        variables: {
          filters: { id: regionId },
        },
        fields: ["id", "name", "currency_code", "countries.iso_2"],
      })
      const { rows } = await remoteQuery(regionQuery)
      const r = rows?.[0]
      if (r && typeof r === "object") {
        const row = r as {
          id?: string
          name?: string
          currency_code?: string
          countries?: { iso_2?: string }[]
        }
        regionSnapshot = {
          id: row.id,
          name: row.name,
          currency_code: row.currency_code,
          country_iso2: row.countries?.map((c) => c?.iso_2).filter(Boolean),
        }
      }
    } catch {
      regionSnapshot = { lookupFailed: true }
    }
    console.info("[payment-providers] region", {
      requestQueryRegionId: regionId,
      storeLockedRegionIdFromEnv: locked,
      requestDiffersFromStoreLock: !!(locked && regionId !== locked),
      regionFromDb: regionSnapshot,
      flags: {
        LOG_PAYMENT_REGION: process.env.LOG_PAYMENT_REGION === "true",
        LOG_PAYMENT_PROVIDERS: process.env.LOG_PAYMENT_PROVIDERS === "true",
      },
    })
  }

  const baseFields = req.queryConfig?.fields?.length
    ? req.queryConfig.fields
    : ["id", "is_enabled"]

  const pagination = req.queryConfig?.pagination ?? { skip: 0 }

  // Payment methods are shown store-wide regardless of the cart's region;
  // region_payment_provider links are intentionally not used to scope this list.
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "payment_provider",
    variables: {
      filters: {
        is_enabled: true,
      },
      ...pagination,
    },
    fields: baseFields,
  })

  const { rows: paymentProviders, metadata } = await remoteQuery(queryObject)

  // Manual/system payment is a Medusa core fallback, not a real checkout
  // option for customers — never surface it in the storefront.
  const withoutManual = paymentProviders.filter(
    (p) => p.id !== "pp_system_default"
  )

  const filtered = applyGatewayEnvFilter(withoutManual, {
    requestQueryRegionId: regionId,
    storeLockedRegionIdFromEnv:
      process.env.STORE_LOCKED_REGION_ID?.trim() ?? null,
  })

  const actorId = (req as any).auth_context?.actor_id as string | undefined
  let customerPhone: string | null = null
  if (actorId) {
    const customerQuery = remoteQueryObjectFromString({
      entryPoint: "customer",
      variables: { filters: { id: actorId } },
      fields: ["phone"],
    })
    const { rows: customerRows } = await remoteQuery(customerQuery)
    customerPhone = (customerRows?.[0] as { phone?: string })?.phone ?? null
  }

  const featureFiltered = await filterProvidersByFeatureAccess(
    req.scope,
    filtered,
    customerPhone
  )

  res.json({
    payment_providers: featureFiltered,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}
