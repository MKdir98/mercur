import { defineRouteConfig } from '@medusajs/admin-sdk'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Heading,
  Button,
  Badge,
  Text,
  Skeleton,
  DropdownMenu,
  Prompt,
} from '@medusajs/ui'
import { useArticle, useDeleteArticle } from '../../../hooks/api/articles'
import { useAuthInterceptor } from '../../../hooks/use-auth-interceptor'
import { resolveImageUrl } from '../../../utils'

const ArticleDetailPage = () => {
  useAuthInterceptor()
  
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { article, isLoading } = useArticle(id!)
  const deleteArticle = useDeleteArticle(id!)

  const handleDelete = async () => {
    try {
      await deleteArticle.mutateAsync()
      navigate('/articles')
    } catch (error) {
      console.error(error)
    }
  }

  if (isLoading) {
    return (
      <Container>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </Container>
    )
  }

  if (!article) {
    return (
      <Container>
        <Text>Article not found</Text>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Heading level="h2">{article.title_en}</Heading>
          <Badge color={article.status === 'published' ? 'green' : 'orange'}>
            {article.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate(`/articles/${id}/edit`)}
          >
            Edit
          </Button>
          <Prompt>
            <Prompt.Trigger asChild>
              <Button variant="danger" size="small">
                Delete
              </Button>
            </Prompt.Trigger>
            <Prompt.Content>
              <Prompt.Title>Delete Article</Prompt.Title>
              <Prompt.Description>
                Are you sure you want to delete this article? This action cannot be undone.
              </Prompt.Description>
              <Prompt.Footer>
                <Prompt.Cancel>Cancel</Prompt.Cancel>
                <Prompt.Action onClick={handleDelete}>
                  Delete
                </Prompt.Action>
              </Prompt.Footer>
            </Prompt.Content>
          </Prompt>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <Text size="small" className="text-gray-500 mb-1">Slug</Text>
            <Text>/{article.handle}</Text>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <Text size="small" className="text-gray-500 mb-1">Author</Text>
            <Text>{article.author_name || '-'}</Text>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <Text size="small" className="text-gray-500 mb-1">Excerpt (EN)</Text>
            <Text>{article.excerpt_en || '-'}</Text>
          </div>

          {article.excerpt_ir && (
            <div className="bg-gray-50 rounded-lg p-4">
              <Text size="small" className="text-gray-500 mb-1">Excerpt (IR)</Text>
              <Text>{article.excerpt_ir}</Text>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {article.cover_image && (
            <div className="bg-gray-50 rounded-lg p-4">
              <Text size="small" className="text-gray-500 mb-1">Cover Image</Text>
              <img
                src={resolveImageUrl(article.cover_image) ?? undefined}
                alt="Cover"
                className="w-full rounded-md"
              />
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <Text size="small" className="text-gray-500 mb-1">Categories</Text>
            <div className="flex flex-wrap gap-1">
              {article.categories?.map((cat) => (
                <Badge key={cat.id}>{cat.name}</Badge>
              ))}
              {(!article.categories || article.categories.length === 0) && (
                <Text size="small">None</Text>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <Text size="small" className="text-gray-500 mb-1">Tags</Text>
            <div className="flex flex-wrap gap-1">
              {article.tags?.map((tag) => (
                <Badge key={tag.id}>{tag.name}</Badge>
              ))}
              {(!article.tags || article.tags.length === 0) && (
                <Text size="small">None</Text>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <Text size="small" className="text-gray-500 mb-1">Created</Text>
            <Text size="small">
              {new Date(article.created_at).toLocaleString()}
            </Text>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <Text size="small" className="text-gray-500 mb-1">Updated</Text>
            <Text size="small">
              {new Date(article.updated_at).toLocaleString()}
            </Text>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({})

export default ArticleDetailPage
