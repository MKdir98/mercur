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

import { ArticleTagDTO } from '@mercurjs/framework'
import { mercurQuery } from '../../lib/client'
import { queryKeysFactory } from '../../lib/query-keys-factory'

const ARTICLE_TAG_QUERY_KEY = 'article-tag' as const
export const articleTagQueryKeys = queryKeysFactory(ARTICLE_TAG_QUERY_KEY)

export const useArticleTags = (
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<
      PaginatedResponse<{ tags: ArticleTagDTO[] }>,
      FetchError,
      PaginatedResponse<{ tags: ArticleTagDTO[] }>,
      QueryKey
    >,
    'queryFn' | 'queryKey'
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: articleTagQueryKeys.list(),
    queryFn: () =>
      mercurQuery('/admin/articles/tags', {
        method: 'GET',
        query
      }),
    ...options
  })
  return { ...data, ...rest }
}

export const useCreateArticleTag = (
  options?: UseMutationOptions<
    { tag: ArticleTagDTO },
    FetchError,
    any
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      mercurQuery('/admin/articles/tags', {
        method: 'POST',
        body: payload
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: articleTagQueryKeys.list()
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}

export const useDeleteArticleTag = (
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
      mercurQuery(`/admin/articles/tags/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: articleTagQueryKeys.list()
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options
  })
}
