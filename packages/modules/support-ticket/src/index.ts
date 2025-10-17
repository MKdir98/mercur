import { Module } from "@medusajs/framework/utils";

import SupportTicketModuleService from "./service";

export const SUPPORT_TICKET_MODULE = "supportTicket";

export { SupportTicketModuleService };

export default Module(SUPPORT_TICKET_MODULE, {
  service: SupportTicketModuleService,
});

