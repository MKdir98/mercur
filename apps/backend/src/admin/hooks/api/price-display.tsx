import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { mercurQuery } from '../../lib/client'
import { AdminStore, storesQueryKeys } from './stores'

export type PriceDisplayUsdMetadata = {
  toman_per_usd: number
  commission_percent: number
}

export const useUpdateStorePriceDisplay = (
  options?: UseMutationOptions<
    { store: AdminStore },
    Error,
    { storeId: string; existingMetadata: Record<string, unknown> | null; priceDisplay: PriceDisplayUsdMetadata }
  >
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      storeId,
      existingMetadata,
      priceDisplay
    }: {
      storeId: string
      existingMetadata: Record<string, unknown> | null
      priceDisplay: PriceDisplayUsdMetadata
    }) =>
      mercurQuery(`/admin/stores/${storeId}`, {
        method: 'POST',
        body: {
          metadata: {
            ...(existingMetadata && typeof existingMetadata === 'object'
              ? existingMetadata
              : {}),
            price_display_usd: {
              toman_per_usd: priceDisplay.toman_per_usd,
              commission_percent: priceDisplay.commission_percent
            }
          }
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKeys.list({}) })
    },
    ...options
  })
}
