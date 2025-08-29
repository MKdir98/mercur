import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { mercurQuery } from '../../lib/client'

export const useRegions = (query?: Record<string, string | number>) => {
  const { data, isLoading } = useQuery({
    queryKey: ['regions', query],
    queryFn: () =>
      mercurQuery('/admin/regions', {
        method: 'GET',
        query: {
          fields: 'id,name,currency_code,countries,city_id,city.*',
          ...query
        }
      })
  })

  return { regions: data?.regions || [], count: data?.count, isLoading }
}

export const useCreateRegion = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      return mercurQuery('/admin/regions', {
        method: 'POST',
        body: data
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] })
    }
  })
}

export const useUpdateRegion = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return mercurQuery(`/admin/regions/${id}`, {
        method: 'POST',
        body: data
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] })
    }
  })
}
