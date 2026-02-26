import { model } from "@medusajs/framework/utils";

export const Translation = model.define("translation", {
  id: model.id({ prefix: "trl" }).primaryKey(),
  source_text: model.text().unique(),
  translated_text: model.text(),
});
