import PostexService from "./service"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { LoaderOptions } from "@medusajs/framework/types"

const loader = async ({ container }: LoaderOptions) => {
  PostexService.setGlobalContainer(container)
}

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [PostexService],
  loaders: [loader],
}) 