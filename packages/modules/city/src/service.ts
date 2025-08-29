import { MedusaService } from "@medusajs/framework/utils";
import { City } from "./models/city";
import { State } from "./models/state";
import { PostexCityMapping } from "./models/postex-city-mapping";

class CityModuleService extends MedusaService({
  City,
  State,
  PostexCityMapping,
}) {}

export default CityModuleService; 