import { model } from "@medusajs/framework/utils";

export const HomepageMediaItem = model.define("homepage_media_item", {
  id: model.id({ prefix: "hm_media" }).primaryKey(),
  key: model.text().unique(),
  label: model.text(),
  type: model.text(),
  image_url: model.text().nullable(),
  video_url: model.text().nullable(),
  link: model.text().nullable(),
  alt: model.text().nullable(),
});
