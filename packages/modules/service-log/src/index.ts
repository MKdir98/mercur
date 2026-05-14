import { Module } from "@medusajs/framework/utils";

import ServiceLogModuleService from "./service";

export const SERVICE_LOG_MODULE = "service_log";
export { ServiceLogModuleService };

export default Module(SERVICE_LOG_MODULE, {
  service: ServiceLogModuleService,
});






