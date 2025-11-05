import { Module } from "@medusajs/framework/utils";

import CityModuleService from "./service";
import { City } from "./models/city";

export const CITY_MODULE = "city";
export { CityModuleService };
export * from './models';

const cityModule = Module(CITY_MODULE, {
  service: CityModuleService,
}); 

// Export linkable for use in module links
export const linkable = {
  city: {
    model: City,
    serviceName: CITY_MODULE,
  }
};

export default cityModule; 