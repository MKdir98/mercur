import { Module } from "@medusajs/framework/utils";

import ApiClientModuleService from "./service";

export const API_CLIENT_MODULE = "api-client";
export { ApiClientModuleService };

export default Module(API_CLIENT_MODULE, {
  service: ApiClientModuleService,
});

