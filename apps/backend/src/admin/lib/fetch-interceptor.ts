/**
 * Global Fetch Interceptor for Admin Panel
 * 
 * This interceptor ensures that all API requests made from the admin panel
 * automatically include the authentication token from localStorage.
 * 
 * This is necessary because Medusa's default SDK doesn't always properly
 * attach the auth token to requests like /admin/users/me
 */

// Store the original fetch function
const originalFetch = window.fetch

// Override the global fetch function
window.fetch = async function (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Get the auth token from localStorage
  const token = localStorage.getItem('medusa_auth_token')

  // If there's a token and this is a request to the API
  if (token && shouldAddAuthToken(input)) {
    // Clone the init object or create a new one
    const enhancedInit: RequestInit = init || {}

    // Clone or create headers
    const headers = new Headers(enhancedInit.headers || {})

    // Add the authorization header if it doesn't already exist
    if (!headers.has('authorization') && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Update the init object with the new headers
    enhancedInit.headers = headers
    
    // Make the request with the enhanced init
    return originalFetch(input, enhancedInit)
  }

  // If no token or not an API request, use the original fetch
  return originalFetch(input, init)
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

