import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import multer from 'multer'

const defaultLimits = {
  fileSize: 20 * 1024 * 1024,
  fieldSize: 20 * 1024 * 1024
}

const interruptedMultipart = (err: Error) => {
  return (
    err.message === 'Unexpected end of form' ||
    err.message === 'Unexpected end of file' ||
    err.message === 'Multipart: Boundary not found' ||
    err.message === 'Malformed part header'
  )
}

const limitErrorMessage = (code: string) => {
  if (code === 'LIMIT_FILE_SIZE' || code === 'LIMIT_FIELD_VALUE') {
    return 'File is too large'
  }
  return 'Invalid upload request'
}

export const multerFilesArray = (fieldName: string) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: defaultLimits
  })
  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const handler = upload.array(fieldName)
    handler(req, res, (err: unknown) => {
      if (!err) {
        return next()
      }
      if (err && typeof err === 'object' && 'code' in err) {
        const code = String((err as { code: string }).code)
        if (code.startsWith('LIMIT_')) {
          const status = code === 'LIMIT_FILE_SIZE' || code === 'LIMIT_FIELD_VALUE' ? 413 : 400
          return res
            .status(status)
            .json({ type: 'invalid_data', message: limitErrorMessage(code) })
        }
      }
      if (err instanceof Error && interruptedMultipart(err)) {
        return res.status(400).json({
          type: 'invalid_data',
          message:
            'Upload was interrupted. Try again, use a smaller file, or ask your host to raise reverse-proxy body size and request timeouts for this app.'
        })
      }
      return next(err)
    })
  }
}
