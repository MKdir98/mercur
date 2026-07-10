import { z } from 'zod'

/**
 * @schema VendorCreateSupportTicket
 * type: object
 * required:
 *   - type
 *   - subject
 *   - message
 * properties:
 *   type:
 *     type: string
 *     enum: [support, complaint, partnership, suggestion]
 *   subject:
 *     type: string
 *   message:
 *     type: string
 */
export type VendorCreateSupportTicketType = z.infer<
  typeof VendorCreateSupportTicket
>
export const VendorCreateSupportTicket = z.object({
  type: z.enum(['support', 'complaint', 'partnership', 'suggestion']),
  subject: z.string().min(1),
  message: z.string().min(1)
})
