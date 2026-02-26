import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  MedusaError
} from '@medusajs/framework/utils'

import { getRequestWorkflowByType } from '../../../../workflows/requests/utils/select-workflow'
import { adminRequestsFields } from '../query-config'
import { updateRequestWorkflow } from '../../../../workflows/requests/workflows'
import { AdminReviewRequestType } from '../validators'

/**
 * @oas [post] /admin/requests/{id}
 * operationId: "AdminReviewRequestById"
 * summary: "Get return request by id"
 * description: "Retrieves a request by id."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the Request.
 *     schema:
 *       type: string
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminReviewRequest"
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             status:
 *               type: string
 *               enum: [accepted,rejected]
 * tags:
 *   - Admin Requests
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminReviewRequestType>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [request]
  } = await query.graph({
    entity: 'request',
    fields: ['id', 'type', 'data', 'submitter_id'],
    filters: {
      id: req.params.id,
      status: 'pending'
    }
  })

  if (!request) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      'This request is already reviewed'
    )
  }

  const body = req.validatedBody ?? req.body
  if (!body?.status) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Request body must include status (accepted or rejected) and reviewer_note'
    )
  }

  if (body.status === 'rejected') {
    await updateRequestWorkflow.run({
      input: {
        id: req.params.id,
        reviewer_id: req.auth_context.actor_id,
        ...body
      },
      container: req.scope
    })

    return res.json({
      id: req.params.id,
      status: 'rejected'
    })
  }

  const workflow = getRequestWorkflowByType(request.type)

  if (!workflow) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'This type of request does not have workflow'
    )
  }

  const { result: createdResource } = await workflow(req.scope).run({
    input: {
      id: req.params.id,
      reviewer_id: req.auth_context.actor_id,
      data: request.data,
      ...body
    },
    throwOnError: true
  })

  return res.json({
    id: req.params.id,
    status: 'accepted',
    createdResourceType: request.type,
    createdResource
  })
}

/**
 * @oas [get] /admin/requests/{id}
 * operationId: "AdminGetRequestById"
 * summary: "Get return request by id"
 * description: "Retrieves a request by id."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the Request.
 *     schema:
 *       type: string
 *   - name: fields
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Comma-separated fields to include in the response.
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             request:
 *               $ref: "#/components/schemas/AdminRequest"
 * tags:
 *   - Admin Requests
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fields = req.queryConfig?.fields ?? adminRequestsFields

  const {
    data: [request]
  } = await query.graph({
    entity: 'request',
    fields,
    filters: {
      id: req.params.id
    }
  })

  res.json({ request })
}
