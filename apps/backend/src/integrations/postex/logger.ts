import * as fs from 'fs'
import * as path from 'path'

const LOG_DIR = process.env.POSTEX_LOG_DIR || path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'postex-api.log')

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function formatEntry(type: string, endpoint: string, data: unknown): string {
  const timestamp = new Date().toISOString()
  const separator = '\n' + '-'.repeat(80) + '\n'
  return `${separator}[${timestamp}] ${type} ${endpoint}\n${JSON.stringify(data, null, 2)}`
}

export function logPostexRequest(endpoint: string, request: unknown) {
  try {
    ensureLogDir()
    // const entry = formatEntry('REQUEST', endpoint, request)
    // fs.appendFileSync(LOG_FILE, entry + '\n')
  } catch {
  }
}

export function logPostexResponse(endpoint: string, response: unknown) {
  try {
    ensureLogDir()
    // const entry = formatEntry('RESPONSE', endpoint, response)
    // fs.appendFileSync(LOG_FILE, entry + '\n')
  } catch {
  }
}

export function logPostexError(endpoint: string, error: unknown) {
  try {
    ensureLogDir()
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error
    const entry = formatEntry('ERROR', endpoint, errorData)
    // fs.appendFileSync(LOG_FILE, entry + '\n')
  } catch {
  }
}
