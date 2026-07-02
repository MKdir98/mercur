import { model } from "@medusajs/framework/utils";

export const Translation = model.define("translation", {
  id: model.id({ prefix: "trl" }).primaryKey(),
  source_text: model.text(),
  translated_text: model.text(),
  entity_type: model.text().nullable(),
  entity_id: model.text().nullable(),
  field_name: model.text().nullable(),
  manually_edited: model.boolean().default(false),
});
