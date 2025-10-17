import { model } from "@medusajs/framework/utils";

export const ApiClient = model.define("api_client", {
  id: model.id({ prefix: "apic" }).primaryKey(),
  name: model.text().searchable(),
  description: model.text().nullable(),
  api_key: model.text().unique(),
  api_secret: model.text(),
  is_active: model.boolean().default(true),
  rate_limit: model.number().nullable(),
  metadata: model.json().nullable(),
});

