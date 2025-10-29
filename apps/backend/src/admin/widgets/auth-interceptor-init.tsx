/**
 * Auth Interceptor Initialization Widget
 * 
 * This widget does nothing visible but ensures the fetch interceptor is loaded
 * when the admin panel starts up.
 */

import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

// Import the fetch interceptor to initialize it
import '../lib/fetch-interceptor'

const AuthInterceptorInit = () => {
  useEffect(() => {
    // Log that the interceptor has been initialized
    console.log('[Admin] Fetch interceptor initialized')
  }, [])

  // This widget doesn't render anything
  return null
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default AuthInterceptorInit

