import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SUPPORT_TICKET_MODULE, SupportTicketModuleService } from "@mercurjs/support-ticket"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const supportTicketService = req.scope.resolve(SUPPORT_TICKET_MODULE) as SupportTicketModuleService

  try {
    const { skip = 0, take = 50, status, type } = req.query

    const filters: any = {}
    if (status) filters.status = status
    if (type) filters.type = type

    const [tickets, count] = await supportTicketService.listAndCountSupportTickets(
      filters,
      {
        skip: Number(skip),
        take: Number(take),
        order: { created_at: 'DESC' }
      }
    )

    res.json({ 
      tickets,
      count,
      skip: Number(skip),
      take: Number(take)
    })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    res.status(500).json({
      error: "Failed to fetch support tickets"
    })
  }
}

