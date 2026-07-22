import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { mercurQuery } from '../../lib/client'
import { normalizeIranPhone } from '../../lib/normalize-iran-phone'

const FEATURE_ACCESS_QUERY_KEY = ['feature-access-store']

// Granted phones per module live in the store's `metadata.feature_access`
// blob (no dedicated table) — same place `price_display_usd` is stored.
export const useFeatureAccess = () => {
  const { data, isLoading } = useQuery({
    queryKey: FEATURE_ACCESS_QUERY_KEY,
    queryFn: () => mercurQuery('/admin/stores', { method: 'GET' }),
  })

  const store = data?.stores?.[0]
  const metadata = (store?.metadata ?? {}) as Record<string, unknown>
  const featureAccess = (metadata.feature_access ?? {}) as Record<string, string[]>

  return {
    storeId: store?.id as string | undefined,
    metadata,
    featureAccess,
    isLoading,
  }
}

const saveModulePhones = (
  storeId: string,
  metadata: Record<string, unknown>,
  moduleName: string,
  phones: string[]
) => {
  const featureAccess = {
    ...((metadata.feature_access ?? {}) as Record<string, string[]>),
    [moduleName]: phones,
  }
  return mercurQuery(`/admin/stores/${storeId}`, {
    method: 'POST',
    body: {
      metadata: {
        ...metadata,
        feature_access: featureAccess,
      },
    },
  })
}

export const useGrantFeatureAccess = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      storeId,
      metadata,
      module_name,
      phones,
      phone,
    }: {
      storeId: string
      metadata: Record<string, unknown>
      module_name: string
      phones: string[]
      phone: string
    }) => {
      const normalized = normalizeIranPhone(phone)
      if (!normalized) {
        throw new Error('Invalid phone number')
      }
      const nextPhones = phones.includes(normalized) ? phones : [...phones, normalized]
      return saveModulePhones(storeId, metadata, module_name, nextPhones)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEATURE_ACCESS_QUERY_KEY })
    },
  })
}

export const useRevokeFeatureAccess = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      storeId,
      metadata,
      module_name,
      phones,
      phone,
    }: {
      storeId: string
      metadata: Record<string, unknown>
      module_name: string
      phones: string[]
      phone: string
    }) => saveModulePhones(storeId, metadata, module_name, phones.filter((p) => p !== phone)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEATURE_ACCESS_QUERY_KEY })
    },
  })
}
