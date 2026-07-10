import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import { FetchError } from '@medusajs/js-sdk'

import { mercurQuery } from '../../lib/client'
import { queryKeysFactory } from '../../lib/query-keys-factory'

export type ProductColorDTO = {
  id: string | null
  value: string
  hex_code: string | null
}

const PRODUCT_COLOR_QUERY_KEY = 'product-color' as const
export const productColorQueryKeys = queryKeysFactory(PRODUCT_COLOR_QUERY_KEY)

export const useProductColors = (
  options?: Omit<
    UseQueryOptions<{ product_colors: ProductColorDTO[] }, FetchError>,
    'queryFn' | 'queryKey'
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: productColorQueryKeys.list(),
    queryFn: () => mercurQuery('/admin/product-colors', { method: 'GET' }),
    ...options
  })
  return { productColors: data?.product_colors, ...rest }
}

export const useUpsertProductColor = (
  options?: UseMutationOptions<
    { product_color: ProductColorDTO },
    FetchError,
    { value: string; hex_code: string }
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      mercurQuery('/admin/product-colors', {
        method: 'POST',
        body: payload
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: productColorQueryKeys.list() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}
