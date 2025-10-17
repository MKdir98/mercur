import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SUPPORT_TICKET_MODULE } from "@mercurjs/support-ticket"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const supportTicketService = req.scope.resolve(SUPPORT_TICKET_MODULE)
  const { id } = req.params

  try {
    const ticket = await supportTicketService.retrieveSupportTicket(id)

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" })
      return
    }

    res.json({ ticket })
  } catch (error) {
    console.error('Error fetching support ticket:', error)
    res.status(500).json({
      error: "Failed to fetch support ticket"
    })
  }
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const supportTicketService = req.scope.resolve(SUPPORT_TICKET_MODULE)
  const idParam = (req.params as any)?.id || (req.query as any)?.id || (req.body as any)?.id

  try {
    const { status, admin_notes } = req.body

    const updateData: any = {}
    if (status) updateData.status = status
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes

    if (!idParam || typeof idParam !== 'string') {
      res.status(400).json({ error: 'Invalid or missing ticket id' })
      return
    }

    const ticket = await supportTicketService.updateSupportTickets(idParam, updateData)

    res.json({ ticket })
  } catch (error) {
    console.error('Error updating support ticket:', error)
    res.status(500).json({
      error: "Failed to update support ticket"
    })
  }
}

