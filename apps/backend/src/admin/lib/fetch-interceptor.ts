/**
 * Global Fetch Interceptor for Admin Panel
 * 
 * This interceptor ensures that all API requests made from the admin panel
 * automatically include the authentication credentials.
 * 
 * Medusa v2 uses cookies for authentication, so we need to ensure credentials are included.
 * We also capture and store auth tokens as a backup mechanism.
 */

// Helper functions for token storage
export function storeAuthToken(token: string) {
  if (token) {
    localStorage.setItem('medusa_auth_token', token)
    console.log('[Admin] Auth token stored:', token.substring(0, 20) + '...')
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('medusa_auth_token')
}

export function removeAuthToken() {
  localStorage.removeItem('medusa_auth_token')
  console.log('[Admin] Auth token removed')
}

// Make these functions globally accessible
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__medusa_storeAuthToken = storeAuthToken
  // @ts-ignore
  window.__medusa_getAuthToken = getAuthToken
  // @ts-ignore
  window.__medusa_removeAuthToken = removeAuthToken
}

// Store the original fetch function
const originalFetch = window.fetch

// Listen for successful login to store token in localStorage as backup
if (typeof window !== 'undefined') {
  // Monitor for successful auth responses
  const originalXHROpen = XMLHttpRequest.prototype.open
  const originalXHRSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (_method: string, url: string | URL) {
    // @ts-ignore
    this._url = url
    // @ts-ignore
    return originalXHROpen.apply(this, arguments)
  }

  XMLHttpRequest.prototype.send = function () {
    // @ts-ignore
    const url = this._url
    if (url && (url.includes('/auth/') || url.includes('/admin/auth'))) {
      this.addEventListener('load', function () {
        if (this.status === 200) {
          try {
            const response = JSON.parse(this.responseText)
            // Store token if present in response
            if (response.token) {
              localStorage.setItem('medusa_auth_token', response.token)
              console.log('[Admin] Auth token stored in localStorage')
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      })
    }
    // @ts-ignore
    return originalXHRSend.apply(this, arguments)
  }
}

// Override the global fetch function
window.fetch = async function (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Clone the init object or create a new one
  const enhancedInit: RequestInit = init || {}

  if (shouldAddAuthToken(input)) {
    // Ensure credentials are included for cookie-based auth
    enhancedInit.credentials = 'include'

    // Clone or create headers
    const headers = new Headers(enhancedInit.headers || {})

    // Try to get token from localStorage as backup
    const token = localStorage.getItem('medusa_auth_token')
    
    // Add the authorization header if we have a token and it's not already set
    if (token && !headers.has('authorization') && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Update the init object with the new headers
    enhancedInit.headers = headers
  }
  
  // Make the request with the enhanced init
  const response = await originalFetch(input, enhancedInit)

  // Check if this is a login response and store the token
  if (response.ok && shouldAddAuthToken(input)) {
    try {
      const clonedResponse = response.clone()
      const data = await clonedResponse.json()
      
      if (data.token) {
        localStorage.setItem('medusa_auth_token', data.token)
        console.log('[Admin] Auth token stored from fetch response')
      }
    } catch (e) {
      // Ignore errors, response might not be JSON
    }
  }

  return response
}

/**
 * Determine if we should add the auth token to this request
 */
function shouldAddAuthToken(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

  // Add auth token to all /admin/ and /auth/ requests
  // But skip external URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Only add token to requests to the same origin
    return url.includes('/admin/') || url.includes('/auth/')
  }

  // For relative URLs, add token to admin and auth routes
  return url.startsWith('/admin/') || url.startsWith('/auth/')
}

export {}

