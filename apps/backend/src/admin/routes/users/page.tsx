import { defineRouteConfig } from '@medusajs/admin-sdk'
import {
  Button,
  Container,
  Heading,
  Input,
  Table,
  Text
} from '@medusajs/ui'
import { Users } from '@medusajs/icons'
import { useState } from 'react'
import { useCustomers, Customer } from '../../hooks/api/customers'
import { useAuthInterceptor } from '../../hooks/use-auth-interceptor'
import { formatDate } from '../../lib/date'

const PAGE_SIZE = 20

const UsersListPage = () => {
  useAuthInterceptor()

  const [currentPage, setCurrentPage] = useState(0)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useCustomers({
    limit: PAGE_SIZE,
    offset: currentPage * PAGE_SIZE,
    ...(search ? { q: search } : {})
  })

  const customers = data?.customers ?? []
  const count = data?.count ?? 0

  const handleExportCsv = async () => {
    const res = await fetch('/admin/customers?fields=id,email,first_name,last_name,phone,created_at,has_account&limit=1000&offset=0', {
      headers: {
        authorization: `Bearer ${window.localStorage.getItem('medusa_auth_token') || ''}`
      },
      credentials: 'include'
    })
    const json = await res.json()
    const allCustomers: Customer[] = json.customers ?? []

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Has Account', 'Created At']
    const rows = allCustomers.map((c) => [
      c.first_name ?? '',
      c.last_name ?? '',
      c.email,
      c.phone ?? '',
      c.has_account ? 'Yes' : 'No',
      formatDate(c.created_at)
    ])

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    // UTF-8 BOM for proper Excel rendering
    const bom = '﻿'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `users-${formatDate(new Date())}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>Users</Heading>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(0)
            }}
            className="w-64"
          />
          <Button variant="secondary" onClick={handleExportCsv}>
            Export Excel
          </Button>
        </div>
      </div>

      <div className="flex size-full flex-col overflow-hidden">
        {isLoading && <Text className="px-6 py-4">Loading...</Text>}
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>First Name</Table.HeaderCell>
              <Table.HeaderCell>Last Name</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Phone</Table.HeaderCell>
              <Table.HeaderCell>Has Account</Table.HeaderCell>
              <Table.HeaderCell>Created At</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {customers.map((customer) => (
              <Table.Row key={customer.id}>
                <Table.Cell>{customer.first_name ?? '—'}</Table.Cell>
                <Table.Cell>{customer.last_name ?? '—'}</Table.Cell>
                <Table.Cell>{customer.email}</Table.Cell>
                <Table.Cell>{customer.phone ?? '—'}</Table.Cell>
                <Table.Cell>{customer.has_account ? 'Yes' : 'No'}</Table.Cell>
                <Table.Cell>{formatDate(customer.created_at)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <Table.Pagination
          className="w-full"
          canNextPage={PAGE_SIZE * (currentPage + 1) < count}
          canPreviousPage={currentPage > 0}
          previousPage={() => setCurrentPage(currentPage - 1)}
          nextPage={() => setCurrentPage(currentPage + 1)}
          count={count}
          pageCount={Math.ceil(count / PAGE_SIZE)}
          pageIndex={currentPage}
          pageSize={PAGE_SIZE}
        />
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: 'Users',
  icon: Users
})

export default UsersListPage
