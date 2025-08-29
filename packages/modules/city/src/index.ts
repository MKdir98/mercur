import { Module } from "@medusajs/framework/utils";

import CityModuleService from "./service";

export const CITY_MODULE = "city";
export { CityModuleService };
export * from './models';

export default Module(CITY_MODULE, {
  service: CityModuleService,
}); 