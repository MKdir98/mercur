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

import { ArticleCategoryDTO } from '@mercurjs/framework'
import { mercurQuery } from '../../lib/client'
import { queryKeysFactory } from '../../lib/query-keys-factory'

const ARTICLE_CATEGORY_QUERY_KEY = 'article-category' as const
export const articleCategoryQueryKeys = queryKeysFactory(ARTICLE_CATEGORY_QUERY_KEY)

export const useArticleCategories = (
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<
      PaginatedResponse<{ categories: ArticleCategoryDTO[] }>,
      FetchError,
      PaginatedResponse<{ categories: ArticleCategoryDTO[] }>,
      QueryKey
    >,
    'queryFn' | 'queryKey'
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: articleCategoryQueryKeys.list(),
    queryFn: () =>
      mercurQuery('/admin/articles/categories', {
        method: 'GET',
        query
      }),
    ...options
  })
  return { ...data, ...rest }
}

export const useCreateArticleCategory = (
  options?: UseMutationOptions<
    { category: ArticleCategoryDTO },
    FetchError,
    any
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      mercurQuery('/admin/articles/categories', {
        method: 'POST',
        body: payload
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: articleCategoryQueryKeys.list()
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

export const useDeleteArticleCategory = (
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
      mercurQuery(`/admin/articles/categories/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: articleCategoryQueryKeys.list()
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}
