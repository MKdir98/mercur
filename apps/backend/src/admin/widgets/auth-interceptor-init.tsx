/**
 * Auth Interceptor Initialization Widget
 * 
 * This widget ensures the fetch interceptor is loaded and monitors authentication state.
 */

import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

// Import the fetch interceptor to initialize it
import '../lib/fetch-interceptor'
import { storeAuthToken, getAuthToken } from '../lib/fetch-interceptor'

const AuthInterceptorInit = () => {
  useEffect(() => {
    console.log('[Admin] Auth widget initialized')
    
    // Check if there's already a token
    const existingToken = getAuthToken()
    if (existingToken) {
      console.log('[Admin] Existing auth token found')
    } else {
      console.log('[Admin] No auth token found in localStorage')
    }

    // Try to extract token from cookies as fallback
    const checkCookies = () => {
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === '_medusa_jwt' || name === 'medusa_auth_token') {
          console.log('[Admin] Found auth token in cookie:', name)
          storeAuthToken(value)
          return
        }
      }
    }

    checkCookies()

    // Periodically check for auth state
    const interval = setInterval(() => {
      const token = getAuthToken()
      if (!token) {
        checkCookies()
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // This widget doesn't render anything
  return null
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default AuthInterceptorInit

