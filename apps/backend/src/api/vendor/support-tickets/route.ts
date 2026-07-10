import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { SUPPORT_TICKET_MODULE, SupportTicketModuleService } from '@mercurjs/support-ticket'

import { fetchSellerByAuthActorId } from '../../../shared/infra/http/utils'
import { VendorCreateSupportTicketType } from './validators'

/**
 * @oas [post] /vendor/support-tickets
 * operationId: "VendorCreateSupportTicket"
 * summary: "Submit a support ticket"
 * description: "Submits a support ticket to the marketplace admin on behalf of the authenticated seller."
 * x-authenticated: true
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/VendorCreateSupportTicket"
 * responses:
 *   "201":
 *     description: Created
 * tags:
 *   - Vendor Support Tickets
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function POST(
  req: AuthenticatedMedusaRequest<VendorCreateSupportTicketType>,
  res: MedusaResponse
): Promise<void> {
  const supportTicketService = req.scope.resolve(
    SUPPORT_TICKET_MODULE
  ) as SupportTicketModuleService

  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope, [
    'id',
    'name',
    'email'
  ])

  const { type, subject, message } = req.validatedBody

  const ticket = await supportTicketService.createSupportTickets({
    name: seller.name,
    email: seller.email || '',
    phone: null,
    type,
    subject,
    message,
    status: 'open'
  })

  res.status(201).json({ ticket })
}
