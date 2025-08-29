import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { mercurQuery } from '../../lib/client'

export const useCities = (query?: Record<string, string | number>) => {
  const { data, isLoading } = useQuery({
    queryKey: ['cities', query],
    queryFn: () =>
      mercurQuery('/admin/cities', {
        method: 'GET',
        query
      })
  })

  return { cities: data?.cities || [], count: data?.count, isLoading }
}

export const useCreateCity = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; country_code: string }) => {
      return mercurQuery('/admin/cities', {
        method: 'POST',
        body: data
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] })
    }
  })
} 