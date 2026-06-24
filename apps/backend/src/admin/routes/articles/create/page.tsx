import { defineRouteConfig } from '@medusajs/admin-sdk'
import { useQueryClient } from '@tanstack/react-query'
import {
  FocusModal,
  Heading,
  Button,
  toast,
} from '@medusajs/ui'
import { useNavigate } from 'react-router-dom'
import { ArticleForm, CreateArticleFormSchema } from '../components/ArticleForm'
import { z } from 'zod'
import { mercurQuery } from '../../../lib/client'
import { articleQueryKeys } from '../../../hooks/api/articles'

const CreateArticlePage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSave = async (data: z.infer<typeof CreateArticleFormSchema>) => {
    try {
      await mercurQuery('/admin/articles', {
        method: 'POST',
        body: data,
      })

      queryClient.invalidateQueries({ queryKey: articleQueryKeys.list() })

      toast.success('Article created!')
      navigate(-1)
    } catch (error) {
      toast.error((error as Error).message)
      console.error(error)
    }
  }

  const handleClose = () => {
    navigate(-1)
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
          <Heading>Create Article</Heading>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center py-16">
          <div>
            <ArticleForm onSubmit={handleSave} mode="create" />
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="article-form">
            Create
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

export const config = defineRouteConfig({})

export default CreateArticlePage
