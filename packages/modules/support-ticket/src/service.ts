import { MedusaService } from '@medusajs/framework/utils'
import { SupportTicket } from './models/support-ticket'

class SupportTicketModuleService extends MedusaService({ SupportTicket }) {}

export default SupportTicketModuleService

