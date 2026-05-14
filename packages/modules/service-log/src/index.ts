import { Module } from "@medusajs/framework/utils";

import ServiceLogModuleService from "./service";
import { Migration20250514000001 } from "./migrations/Migration20250514000001";

export const SERVICE_LOG_MODULE = "service_log";
export { ServiceLogModuleService };

export default Module(SERVICE_LOG_MODULE, {
  service: ServiceLogModuleService,
  migrations: [Migration20250514000001],
});






