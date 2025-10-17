import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SUPPORT_TICKET_MODULE } from "@mercurjs/support-ticket"

type CreateTicketBody = {
  name: string
  email: string
  phone?: string
  type: string
  subject: string
  message: string
}

export async function POST(
  req: MedusaRequest<CreateTicketBody>,
  res: MedusaResponse
): Promise<void> {
  const supportTicketService = req.scope.resolve(SUPPORT_TICKET_MODULE)

  const { name, email, phone, type, subject, message } = req.body

  // Validation
  if (!name || !email || !type || !subject || !message) {
    res.status(400).json({
      error: "Missing required fields: name, email, type, subject, message"
    })
    return
  }

  const validTypes = ['support', 'complaint', 'partnership', 'suggestion']
  if (!validTypes.includes(type)) {
    res.status(400).json({
      error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
    })
    return
  }

  try {
    const ticket = await supportTicketService.createSupportTickets({
      name,
      email,
      phone: phone || null,
      type,
      subject,
      message,
      status: 'open'
    })

    res.json({ ticket })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    res.status(500).json({
      error: "Failed to create support ticket"
    })
  }
}
