import {
  WorkflowResponse,
  createWorkflow
} from '@medusajs/framework/workflows-sdk'

import {
  UpdateStockLocationAddressCityIdInput,
  updateStockLocationAddressCityIdStep
} from '../steps'

export const updateStockLocationAddressCityIdWorkflow = createWorkflow(
  {
    name: 'update-stock-location-address-city-id'
  },
  function (input: UpdateStockLocationAddressCityIdInput) {
    const result = updateStockLocationAddressCityIdStep(input)
    return new WorkflowResponse(result)
  }
)












