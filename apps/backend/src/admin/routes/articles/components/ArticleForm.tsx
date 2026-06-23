import { useState, useEffect } from 'react'
import {
  Input,
  Label,
  Select,
  Switch,
  Text,
  Tabs,
} from '@medusajs/ui'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArticleDTO } from '@mercurjs/framework'
import { TipTapEditor } from './TipTapEditor'
import { ImageUploader } from './ImageUploader'
import { TagSelect } from './TagSelect'
import { CategorySelect } from './CategorySelect'

export const CreateArticleFormSchema = z.object({
  handle: z.string().min(1),
  status: z.enum(['draft', 'published']).default('draft'),
  author_name: z.string().optional(),
  author_avatar: z.string().optional(),
  cover_image: z.string().optional(),
  thumbnail: z.string().optional(),
  title_en: z.string().min(1),
  content_en: z.string().min(1),
  excerpt_en: z.string().optional(),
  meta_title_en: z.string().optional(),
  meta_desc_en: z.string().optional(),
  title_ir: z.string().optional(),
  content_ir: z.string().optional(),
  excerpt_ir: z.string().optional(),
  meta_title_ir: z.string().optional(),
  meta_desc_ir: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  tag_ids: z.array(z.string()).optional(),
  category_ids: z.array(z.string()).optional(),
})

export const UpdateArticleFormSchema = CreateArticleFormSchema.partial()

type CreateFormValues = z.infer<typeof CreateArticleFormSchema>
type UpdateFormValues = z.infer<typeof UpdateArticleFormSchema>

interface ArticleFormProps {
  initialData?: ArticleDTO
  onSubmit: (data: CreateFormValues | UpdateFormValues) => Promise<void>
  mode?: 'create' | 'update'
}

export const ArticleForm = ({
  initialData,
  onSubmit,
  mode = 'create',
}: ArticleFormProps) => {
  const form = useForm<CreateFormValues | UpdateFormValues>({
    resolver: zodResolver(
      mode === 'create' ? CreateArticleFormSchema : UpdateArticleFormSchema
    ),
    defaultValues: {
      handle: initialData?.handle || '',
      status: initialData?.status || 'draft',
      author_name: initialData?.author_name || '',
      author_avatar: initialData?.author_avatar || '',
      cover_image: initialData?.cover_image || '',
      thumbnail: initialData?.thumbnail || '',
      title_en: initialData?.title_en || '',
      content_en: initialData?.content_en || '',
      excerpt_en: initialData?.excerpt_en || '',
      meta_title_en: initialData?.meta_title_en || '',
      meta_desc_en: initialData?.meta_desc_en || '',
      title_ir: initialData?.title_ir || '',
      content_ir: initialData?.content_ir || '',
      excerpt_ir: initialData?.excerpt_ir || '',
      meta_title_ir: initialData?.meta_title_ir || '',
      meta_desc_ir: initialData?.meta_desc_ir || '',
      tag_ids: initialData?.tags?.map((t) => t.id) || [],
      category_ids: initialData?.categories?.map((c) => c.id) || [],
    },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error(error)
    }
  })

  const [activeTab, setActiveTab] = useState('en')

  return (
    <FormProvider {...form}>
      <form id="article-form" onSubmit={handleSubmit}>
        <div className="grid gap-4 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label size="small" htmlFor="handle">Slug</Label>
              <Input
                size="small"
                id="handle"
                className="mt-1"
                placeholder="my-article-slug"
                {...form.register('handle')}
              />
              {form.formState.errors.handle && (
                <Text className="text-red-500 text-sm mt-1">
                  {form.formState.errors.handle.message}
                </Text>
              )}
            </div>
            <div>
              <Label size="small" htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) =>
                  form.setValue('status', value as 'draft' | 'published')
                }
              >
                <Select.Trigger className="mt-1">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="draft">Draft</Select.Item>
                  <Select.Item value="published">Published</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label size="small" htmlFor="author_name">Author Name</Label>
              <Input
                size="small"
                id="author_name"
                className="mt-1"
                {...form.register('author_name')}
              />
            </div>
            <div>
              <Label size="small" htmlFor="author_avatar">Author Avatar URL</Label>
              <Input
                size="small"
                id="author_avatar"
                className="mt-1"
                {...form.register('author_avatar')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageUploader
              value={form.watch('cover_image') || null}
              onChange={(url) => form.setValue('cover_image', url || '')}
              label="Cover Image"
            />
            <ImageUploader
              value={form.watch('thumbnail') || null}
              onChange={(url) => form.setValue('thumbnail', url || '')}
              label="Thumbnail"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Trigger value="en">English</Tabs.Trigger>
              <Tabs.Trigger value="ir">Persian (Farsi)</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="en" className="mt-4 space-y-4">
              <div>
                <Label size="small">Title (EN)</Label>
                <Input
                  size="small"
                  value={form.watch('title_en')}
                  onChange={(e) => form.setValue('title_en', e.target.value)}
                  className="mt-1"
                />
                {form.formState.errors.title_en && (
                  <Text className="text-red-500 text-sm mt-1">
                    {form.formState.errors.title_en.message}
                  </Text>
                )}
              </div>
              <div>
                <Label size="small">Excerpt (EN)</Label>
                <Input
                  size="small"
                  value={form.watch('excerpt_en') || ''}
                  onChange={(e) => form.setValue('excerpt_en', e.target.value)}
                  className="mt-1"
                />
              </div>
              <TipTapEditor
                value={form.watch('content_en')}
                onChange={(value) => form.setValue('content_en', value)}
                label="Content (EN)"
                placeholder="Write your article in English..."
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label size="small">Meta Title (EN)</Label>
                  <Input
                    size="small"
                    value={form.watch('meta_title_en') || ''}
                    onChange={(e) => form.setValue('meta_title_en', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label size="small">Meta Description (EN)</Label>
                  <Input
                    size="small"
                    value={form.watch('meta_desc_en') || ''}
                    onChange={(e) => form.setValue('meta_desc_en', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </Tabs.Content>
            <Tabs.Content value="ir" className="mt-4 space-y-4">
              <div>
                <Label size="small">Title (IR)</Label>
                <Input
                  size="small"
                  value={form.watch('title_ir') || ''}
                  onChange={(e) => form.setValue('title_ir', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label size="small">Excerpt (IR)</Label>
                <Input
                  size="small"
                  value={form.watch('excerpt_ir') || ''}
                  onChange={(e) => form.setValue('excerpt_ir', e.target.value)}
                  className="mt-1"
                />
              </div>
              <TipTapEditor
                value={form.watch('content_ir') || ''}
                onChange={(value) => form.setValue('content_ir', value)}
                label="Content (IR)"
                placeholder="Persian content..."
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label size="small">Meta Title (IR)</Label>
                  <Input
                    size="small"
                    value={form.watch('meta_title_ir') || ''}
                    onChange={(e) => form.setValue('meta_title_ir', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label size="small">Meta Description (IR)</Label>
                  <Input
                    size="small"
                    value={form.watch('meta_desc_ir') || ''}
                    onChange={(e) => form.setValue('meta_desc_ir', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </Tabs.Content>
          </Tabs>

          <div className="border-t pt-4">
            <CategorySelect
              value={form.watch('category_ids') || []}
              onChange={(value) => form.setValue('category_ids', value)}
            />
          </div>

          <div>
            <TagSelect
              value={form.watch('tag_ids') || []}
              onChange={(value) => form.setValue('tag_ids', value)}
            />
          </div>
        </div>
      </form>
    </FormProvider>
  )
}
