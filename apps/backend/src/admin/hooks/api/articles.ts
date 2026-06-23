import {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import { FetchError } from '@medusajs/js-sdk'
import { PaginatedResponse } from '@medusajs/types'

import {
  ArticleDTO
} from '@mercurjs/framework'
import { mercurQuery } from '../../lib/client'
import { queryKeysFactory } from '../../lib/query-keys-factory'

const ARTICLE_QUERY_KEY = 'article' as const
export const articleQueryKeys = queryKeysFactory(ARTICLE_QUERY_KEY)

export const useArticles = (
  query?: any,
  options?: Omit<
    UseQueryOptions<
      PaginatedResponse<{ articles: ArticleDTO[] }>,
      FetchError,
      PaginatedResponse<{ articles: ArticleDTO[] }>,
      QueryKey
    >,
    'queryFn' | 'queryKey'
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: articleQueryKeys.list(),
    queryFn: () =>
      mercurQuery('/admin/articles', {
        method: 'GET',
        query
      }),
    ...options
  })
  return { ...data, ...rest }
}

export const useArticle = (
  id: string,
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<
      { article: ArticleDTO },
      FetchError,
      { article: ArticleDTO },
      QueryKey
    >,
    'queryFn' | 'queryKey'
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: articleQueryKeys.detail(id, query),
    queryFn: () =>
      mercurQuery(`/admin/articles/${id}`, {
        method: 'GET',
        query
      }),
    ...options
  })
  return { ...data, ...rest }
}

export const useCreateArticle = (
  options?: UseMutationOptions<
    { article: ArticleDTO },
    FetchError,
    any
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      mercurQuery('/admin/articles', {
        method: 'POST',
        body: payload
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: articleQueryKeys.list()
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

export const useUpdateArticle = (
  id: string,
  options?: UseMutationOptions<
    { article: ArticleDTO },
    FetchError,
    any
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      mercurQuery(`/admin/articles/${id}`, {
        method: 'POST',
        body: payload
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: articleQueryKeys.detail(id)
      })
      queryClient.invalidateQueries({
        queryKey: articleQueryKeys.list()
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

export const useDeleteArticle = (
  id: string,
  options?: UseMutationOptions<
    { id: string; object: string; deleted: boolean },
    FetchError,
    void
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      mercurQuery(`/admin/articles/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: articleQueryKeys.list()
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}
