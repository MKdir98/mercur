import { useQuery } from '@tanstack/react-query'
import { mercurQuery } from '../../lib/client'
import { queryKeysFactory } from '../../lib/query-keys-factory'

export const customerQueryKeys = queryKeysFactory('customers')

export interface Customer {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
  has_account: boolean
}

export interface CustomersResponse {
  customers: Customer[]
  count: number
  limit: number
  offset: number
}

export const useCustomers = (query?: Record<string, string | number>) => {
  return useQuery({
    queryKey: customerQueryKeys.list(query),
    queryFn: () =>
      mercurQuery('/admin/customers', {
        method: 'GET',
        query: {
          fields: 'id,email,first_name,last_name,phone,created_at,has_account',
          ...query
        }
      }) as Promise<CustomersResponse>
  })
}
