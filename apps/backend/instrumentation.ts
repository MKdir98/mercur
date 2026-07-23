// Uncomment this file to enable instrumentation and observability using OpenTelemetry
// Refer to the docs for installation instructions: https://docs.medusajs.com/v2/debugging-and-testing/instrumentation
// If using an exporter other than Zipkin, require it here.
// import { ZipkinExporter } from '@opentelemetry/exporter-zipkin'

// import { registerOtel } from '@medusajs/medusa'

// // If using an exporter other than Zipkin, initialize it here.
// const exporter = new ZipkinExporter({
//   serviceName: 'my-medusa-project'
// })

// export function register() {
//   registerOtel({
//     serviceName: 'medusajs',
//     // pass exporter
//     exporter,
//     instrument: {
//       http: true,
//       workflows: true,
//       query: true
//     }
//   })
// }

import { kibanaLogger } from './src/infrastructure/kibana-logger'

// Ad-hoc console.error/console.warn calls throughout the codebase aren't
// routed through kibanaLogger individually — patching console here catches
// all of them (and anything future code adds) without touching every call
// site, so doorfestival-app-logs reflects everything that would otherwise
// only show up in stdout.
function formatConsoleArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) return arg.stack || arg.message
      if (typeof arg === 'string') return arg
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
}

export function register() {
  const originalError = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    originalError(...args)
    kibanaLogger.error(formatConsoleArgs(args), { service: 'console' })
  }

  const originalWarn = console.warn.bind(console)
  console.warn = (...args: unknown[]) => {
    originalWarn(...args)
    kibanaLogger.warn(formatConsoleArgs(args), { service: 'console' })
  }
}
