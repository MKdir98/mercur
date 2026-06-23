import { createColumnHelper } from '@tanstack/react-table'
import { Badge, Text } from '@medusajs/ui'
import { ArticleDTO } from '@mercurjs/framework'

const columnHelper = createColumnHelper<ArticleDTO>()

export const useArticleTableColumns = () => {
  const columns = [
    columnHelper.accessor('title_en', {
      header: 'Title',
      cell: ({ row }) => (
        <Text size="small" className="truncate max-w-[300px]">
          {row.original.title_en}
        </Text>
      )
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          color={row.original.status === 'published' ? 'green' : 'orange'}
        >
          {row.original.status}
        </Badge>
      )
    }),
    columnHelper.accessor('handle', {
      header: 'Slug',
      cell: ({ row }) => (
        <Text size="small" className="text-gray-500">
          /{row.original.handle}
        </Text>
      )
    }),
    columnHelper.accessor('author_name', {
      header: 'Author',
      cell: ({ row }) => (
        <Text size="small">
          {row.original.author_name || '-'}
        </Text>
      )
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      cell: ({ row }) => (
        <Text size="small" className="text-gray-500">
          {new Date(row.original.created_at).toLocaleDateString()}
        </Text>
      )
    })
  ]

  return columns
}
