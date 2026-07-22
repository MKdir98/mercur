import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { mercurQuery } from '../../lib/client'

export type FeatureModule = {
  id: string
  module_name: string
  is_gated: boolean
}

export type FeatureGrant = {
  id: string
  module_name: string
  phone: string
  granted_by: string | null
  expires_at: string | null
  created_at: string
}

export const useFeatureModules = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-modules'],
    queryFn: () => mercurQuery('/admin/feature-access/modules', { method: 'GET' })
  })

  return {
    featureModules: (data?.feature_modules || []) as FeatureModule[],
    isLoading
  }
}

export const useUpsertFeatureModule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { module_name: string; is_gated: boolean }) =>
      mercurQuery('/admin/feature-access/modules', {
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-modules'] })
    }
  })
}

export const useFeatureGrants = (moduleName: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-grants', moduleName],
    queryFn: () =>
      mercurQuery('/admin/feature-access/grants', {
        method: 'GET',
        query: { module_name: moduleName, limit: 100 }
      }),
    enabled: !!moduleName
  })

  return {
    grants: (data?.feature_grants || []) as FeatureGrant[],
    count: data?.count || 0,
    isLoading
  }
}

export const useCreateFeatureGrant = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { module_name: string; phone: string }) =>
      mercurQuery('/admin/feature-access/grants', {
        method: 'POST',
        body: data
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['feature-grants', variables.module_name]
      })
    }
  })
}

export const useDeleteFeatureGrant = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string; module_name: string }) =>
      mercurQuery(`/admin/feature-access/grants/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['feature-grants', variables.module_name]
      })
    }
  })
}
