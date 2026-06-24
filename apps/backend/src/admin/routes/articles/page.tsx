import { defineRouteConfig } from '@medusajs/admin-sdk'
import {
  Container,
  Heading,
  Button,
  DataTable,
  useDataTable,
  DataTablePaginationState,
} from '@medusajs/ui'
import { DocumentText } from '@medusajs/icons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SingleColumnLayout } from '../../layouts/single-column'
import { useArticleTableColumns } from '../../hooks/table/columns/use-article-table-columns'
import { useAuthInterceptor } from '../../hooks/use-auth-interceptor'
import { ArticleDTO } from '@mercurjs/framework'
import { useArticles } from '../../hooks/api/articles'

const ArticlesPage = () => {
  useAuthInterceptor()
  
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { articles, count, isLoading } = useArticles({
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  const columns = useArticleTableColumns()

  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: page - 1,
    pageSize,
  })

  const [search, setSearch] = useState('')

  const table = useDataTable({
    columns,
    data: articles || [],
    getRowId: (article: ArticleDTO) => article.id,
    rowCount: count || 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: (newPagination) => {
        setPagination(newPagination)
        setPage(newPagination.pageIndex + 1)
      },
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    onRowClick: (_event, row: ArticleDTO) => {
      navigate(`/articles/${row.id}`)
    },
  })

  return (
    <SingleColumnLayout>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Articles</Heading>
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate('/articles/create')}
          >
            Create
          </Button>
        </div>

        <div>
          <DataTable instance={table}>
            <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
              <DataTable.Search placeholder="Search articles..." />
            </DataTable.Toolbar>
            <DataTable.Table />
            <DataTable.Pagination />
          </DataTable>
        </div>
      </Container>
    </SingleColumnLayout>
  )
}

export const config = defineRouteConfig({
  label: 'Articles',
  icon: DocumentText,
})

export default ArticlesPage
