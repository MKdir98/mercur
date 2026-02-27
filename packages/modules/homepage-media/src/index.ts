import { Module } from "@medusajs/framework/utils";

import HomepageMediaModuleService from "./service";

export const HOMEPAGE_MEDIA_MODULE = "homepage_media";
export { HomepageMediaModuleService };

export default Module(HOMEPAGE_MEDIA_MODULE, {
  service: HomepageMediaModuleService,
});
