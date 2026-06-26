import { Modules } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

export const activateProductCategoriesStep = createStep(
  'activate-product-categories',
  async (input: { product_id: string }, { container }) => {
    const service = container.resolve(Modules.PRODUCT)

    const product = await service.retrieveProduct(input.product_id, {
      relations: ['categories']
    })

    if (!product.categories?.length) {
      return new StepResponse([])
    }

    const categoryIdsToActivate: string[] = []

    for (const category of product.categories) {
      let currentId: string | null = category.id

      while (currentId) {
        const cat = await service.retrieveProductCategory(currentId, {
          relations: ['parent_category']
        })

        if (!cat.is_active) {
          categoryIdsToActivate.push(cat.id)
        }

        currentId = (cat as any).parent_category?.id ?? null
      }
    }

    if (!categoryIdsToActivate.length) {
      return new StepResponse([])
    }

    const activated = await service.updateProductCategories(
      { id: categoryIdsToActivate },
      { is_active: true }
    )

    return new StepResponse(activated, categoryIdsToActivate)
  },
  async (categoryIds: string[] | undefined, { container }) => {
    if (!categoryIds?.length) return

    const service = container.resolve(Modules.PRODUCT)
    await service.updateProductCategories(
      { id: categoryIds },
      { is_active: false }
    )
  }
)
