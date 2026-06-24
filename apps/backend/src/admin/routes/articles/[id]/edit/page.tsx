import { defineRouteConfig } from '@medusajs/admin-sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FocusModal,
  Heading,
  Button,
  toast,
  Skeleton,
} from '@medusajs/ui'
import { useArticle } from '../../../../hooks/api/articles'
import { ArticleForm, UpdateArticleFormSchema } from '../../components/ArticleForm'
import { z } from 'zod'
import { mercurQuery } from '../../../../lib/client'
import { articleQueryKeys } from '../../../../hooks/api/articles'

const EditArticlePage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { article, isLoading } = useArticle(id!)

  const handleSave = async (data: z.infer<typeof UpdateArticleFormSchema>) => {
    try {
      await mercurQuery(`/admin/articles/${id}`, {
        method: 'POST',
        body: data,
      })

      queryClient.invalidateQueries({ queryKey: articleQueryKeys.list() })
      queryClient.invalidateQueries({ queryKey: articleQueryKeys.detail(id!) })

      toast.success('Article updated!')
      navigate(-1)
    } catch (error) {
      toast.error((error as Error).message)
      console.error(error)
    }
  }

  const handleClose = () => {
    navigate(-1)
  }

  if (isLoading) {
    return (
      <FocusModal open={true} onOpenChange={() => handleClose()}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading>Edit Article</Heading>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center py-16">
            <Skeleton className="h-96 w-full max-w-3xl" />
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    )
  }

  return (
    <FocusModal
      open={true}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <FocusModal.Content>
        <FocusModal.Header>
          <Heading>Edit Article</Heading>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center py-16">
          <div>
            <ArticleForm
              initialData={article}
              onSubmit={handleSave}
              mode="update"
            />
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="article-form">
            Update
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

export const config = defineRouteConfig({})

export default EditArticlePage
