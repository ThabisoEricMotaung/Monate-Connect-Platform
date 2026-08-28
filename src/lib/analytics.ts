/**
 * GA4 Analytics initialization and user identification
 * Handles anonymous user tracking and authenticated user identification
 */

const ANONYMOUS_USER_ID_KEY = 'aiform_anonymous_id'
const CONSENT_KEY = 'aiform_analytics_consent'

/**
 * Generate or retrieve anonymous user ID for analytics
 * Persists across sessions for tracking
 */
export function getOrCreateAnonymousUserId(): string {
  if (typeof window === 'undefined') return ''

  try {
    let anonId = localStorage.getItem(ANONYMOUS_USER_ID_KEY)
    if (!anonId) {
      anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem(ANONYMOUS_USER_ID_KEY, anonId)
    }
    return anonId
  } catch {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Initialize GA4 with anonymous user ID
 * Call once on app load before any tracking events
 */
export function initializeAnalytics(): void {
  if (typeof window === 'undefined' || !window.gtag) return

  const anonId = getOrCreateAnonymousUserId()

  // Set anonymous user ID for all GA4 events
  window.gtag('config', 'G_MEASUREMENT_ID', {
    'user_id': anonId,
    'anonymize_ip': true,
  })

  console.log('📊 GA4: Initialized with anonymous ID', anonId)
}

/**
 * Identify authenticated user and link to previous anonymous session
 * Call after user successfully authenticates
 */
export function identifyAuthenticatedUser(userId: string, userData?: {
  email?: string
  role?: string
  businessName?: string
}): void {
  if (typeof window === 'undefined' || !window.gtag) return

  const anonId = getOrCreateAnonymousUserId()

  // Identify the user in GA4
  window.gtag('config', 'G_MEASUREMENT_ID', {
    'user_id': userId,
    'authenticated': true,
    'previous_anonymous_id': anonId,
  })

  // Set user properties for segmentation
  if (userData) {
    window.gtag('event', 'user_identified', {
      user_id: userId,
      email: userData.email,
      role: userData.role,
      business_name: userData.businessName,
      timestamp: new Date().toISOString(),
    })
  }

  console.log('📊 GA4: User identified', { userId, ...userData })
}

/**
 * Clear user identification on logout
 */
export function clearUserIdentification(): void {
  if (typeof window === 'undefined' || !window.gtag) return

  const anonId = getOrCreateAnonymousUserId()

  // Reset to anonymous tracking
  window.gtag('config', 'G_MEASUREMENT_ID', {
    'user_id': anonId,
    'authenticated': false,
  })

  console.log('📊 GA4: User identification cleared, reverted to anonymous')
}

/**
 * Check if user has consented to analytics
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const consent = localStorage.getItem(CONSENT_KEY)
    return consent === 'true'
  } catch {
    return false
  }
}

/**
 * Set analytics consent preference
 */
export function setAnalyticsConsent(consent: boolean): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CONSENT_KEY, consent ? 'true' : 'false')
    console.log('📊 Analytics consent updated:', consent)
  } catch {
    // Silent fail - localStorage unavailable
  }
}
