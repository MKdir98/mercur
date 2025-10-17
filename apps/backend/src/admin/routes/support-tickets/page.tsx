import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubble } from "@medusajs/icons"
import { Container, Heading, Badge, Table, Button, Label, Textarea } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import React, { useState } from "react"

interface SupportTicket {
  id: string
  name: string
  email: string
  phone?: string
  type: 'support' | 'complaint' | 'partnership' | 'suggestion'
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  admin_notes?: string
  created_at: string
  updated_at: string
}

const fetchTickets = async () => {
  const response = await fetch('/admin/support-tickets')
  if (!response.ok) {
    throw new Error('Failed to fetch tickets')
  }
  return response.json() as Promise<{ tickets: SupportTicket[] }>
}

const updateTicket = async ({ id, status, admin_notes }: { id: string, status?: string, admin_notes?: string }) => {
  const response = await fetch(`/admin/support-tickets/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, admin_notes })
  })
  if (!response.ok) {
    throw new Error('Failed to update ticket')
  }
  return response.json()
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'red'
    case 'in_progress':
      return 'orange'
    case 'resolved':
      return 'green'
    case 'closed':
      return 'grey'
    default:
      return 'grey'
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'support':
      return 'پشتیبانی'
    case 'complaint':
      return 'شکایت'
    case 'partnership':
      return 'همکاری'
    case 'suggestion':
      return 'پیشنهاد'
    default:
      return type
  }
}

function TicketRow({ ticket }: { ticket: SupportTicket }) {
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState(ticket.admin_notes || '')

  const mutation = useMutation({
    mutationFn: updateTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    }
  })

  const nextStatus = () => {
    switch (ticket.status) {
      case 'open':
        return 'in_progress'
      case 'in_progress':
        return 'resolved'
      case 'resolved':
        return 'closed'
      default:
        return 'open'
    }
  }

  return (
    <Table.Row>
      <Table.Cell>
        <div className="flex flex-col">
          <span className="font-medium">{ticket.name}</span>
          <span className="text-xs text-gray-500">{ticket.email}</span>
          {ticket.phone && <span className="text-xs text-gray-500">{ticket.phone}</span>}
        </div>
      </Table.Cell>
      <Table.Cell>
        <div className="flex flex-col">
          <span className="text-sm">{getTypeLabel(ticket.type)}</span>
          <span className="text-xs text-gray-500">{ticket.subject}</span>
        </div>
      </Table.Cell>
      <Table.Cell>
        <div className="max-w-xs whitespace-pre-wrap text-sm">{ticket.message}</div>
      </Table.Cell>
      <Table.Cell>
        <Badge color={getStatusColor(ticket.status)}>{ticket.status}</Badge>
      </Table.Cell>
      <Table.Cell>
        <div className="flex flex-col gap-2">
          <div>
            <Label className="mb-1">یادداشت ادمین</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}>
            </Textarea>
          </div>
          <div className="flex gap-2">
            <Button
              size="small"
              variant="secondary"
              onClick={() => mutation.mutate({ id: ticket.id, admin_notes: notes })}
              disabled={mutation.isPending}
            >
              ذخیره یادداشت
            </Button>
            <Button
              size="small"
              onClick={() => mutation.mutate({ id: ticket.id, status: nextStatus() })}
              disabled={mutation.isPending}
            >
              تغییر وضعیت → {nextStatus()}
            </Button>
          </div>
        </div>
      </Table.Cell>
    </Table.Row>
  )
}

export default function SupportTicketsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: fetchTickets,
  })

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <Heading level="h1">Support Tickets</Heading>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-500">در حال بارگذاری...</div>
      )}
      {error && (
        <div className="text-sm text-red-600">خطا در بارگذاری تیکت‌ها</div>
      )}

      {!isLoading && !error && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>کاربر</Table.HeaderCell>
              <Table.HeaderCell>نوع/موضوع</Table.HeaderCell>
              <Table.HeaderCell>پیام</Table.HeaderCell>
              <Table.HeaderCell>وضعیت</Table.HeaderCell>
              <Table.HeaderCell>اقدامات</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(data?.tickets || []).map((t) => (
              <TicketRow key={t.id} ticket={t} />
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Support Tickets",
  icon: ChatBubble,
})

