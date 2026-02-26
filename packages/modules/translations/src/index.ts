import { Module } from "@medusajs/framework/utils";

import TranslationsModuleService from "./service";

export const TRANSLATIONS_MODULE = "translations";
export { TranslationsModuleService };

export default Module(TRANSLATIONS_MODULE, {
  service: TranslationsModuleService,
});
