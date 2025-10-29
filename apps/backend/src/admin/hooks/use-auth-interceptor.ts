/**
 * Auth Interceptor Hook
 * 
 * This hook ensures the fetch interceptor is initialized.
 * It can be called from any component to ensure auth headers are added to all requests.
 */

import { useEffect } from 'react'

// Import the interceptor as a side effect
import '../lib/fetch-interceptor'

let initialized = false

export const useAuthInterceptor = () => {
  useEffect(() => {
    if (!initialized) {
      initialized = true
      console.log('[Admin] Auth interceptor initialized')
    }
  }, [])
}

