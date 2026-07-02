import {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import { mercurQuery } from '../../lib/client'
import { queryKeysFactory } from '../../lib/query-keys-factory'
import {
  AdminCreateTranslation,
  AdminUpdateTranslation,
  Translation
} from '../../routes/settings/translations/types'

export const translationsQueryKeys = queryKeysFactory('translations')

export const useTranslations = (
  query?: Record<string, string | number>,
  options?: Omit<
    UseQueryOptions<
      Record<string, string | number>,
      Error,
      { translations: Translation[]; count: number; offset: number; limit: number },
      QueryKey
    >,
    'queryFn' | 'queryKey'
  >
) => {
  const { data, ...other } = useQuery({
    queryKey: translationsQueryKeys.list(query),
    queryFn: () =>
      mercurQuery('/admin/translations', {
        method: 'GET',
        query
      }),
    placeholderData: (prev) => prev,
    ...options
  })

  return { ...data, ...other }
}

export const useCreateTranslation = (
  options?: UseMutationOptions<
    { translation?: Translation },
    Error,
    AdminCreateTranslation
  >
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) =>
      mercurQuery('/admin/translations', {
        method: 'POST',
        body: payload
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: translationsQueryKeys.lists() })
    },
    ...options
  })
}

export const useUpdateTranslation = (
  options?: UseMutationOptions<
    { translation?: Translation },
    Error,
    { id: string } & AdminUpdateTranslation
  >
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) =>
      mercurQuery(`/admin/translations/${id}`, {
        method: 'POST',
        body
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: translationsQueryKeys.lists() })
    },
    ...options
  })
}

export const useDeleteTranslation = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) =>
      mercurQuery(`/admin/translations/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: translationsQueryKeys.lists() })
    },
    ...options
  })
}

export const useGenerateTranslation = (
  options?: UseMutationOptions<
    { translation?: Translation; skipped?: boolean; reason?: string },
    Error,
    { entity_type: string; entity_id: string; field_name: string; force?: boolean }
  >
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) =>
      mercurQuery('/admin/translations/generate', {
        method: 'POST',
        body: payload
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: translationsQueryKeys.lists() })
    },
    ...options
  })
}

export const useEntityTranslations = (
  entity_type: string,
  entity_id: string,
  options?: Omit<
    UseQueryOptions<
      Record<string, unknown>,
      Error,
      { translations: Translation[] },
      QueryKey
    >,
    'queryFn' | 'queryKey'
  >
) => {
  const { data, ...other } = useQuery({
    queryKey: translationsQueryKeys.list({ entity_type, entity_id }),
    queryFn: () =>
      mercurQuery('/admin/translations', {
        method: 'GET',
        query: { entity_type, entity_id, limit: 20 }
      }),
    enabled: !!entity_id,
    ...options
  })

  return { translations: (data as any)?.translations as Translation[] | undefined, ...other }
}

export const useImportTranslations = (
  options?: UseMutationOptions<
    { created: number; updated: number; skipped?: number; total: number },
    Error,
    File
  >
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const bearer =
        (typeof window !== 'undefined' && window.localStorage.getItem('medusa_auth_token')) || ''
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/admin/translations/import', {
        method: 'POST',
        credentials: 'include',
        headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
        body: formData
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || 'Import failed')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: translationsQueryKeys.lists() })
    },
    ...options
  })
}
