'use client'

import { useEffect } from 'react'
import { initializeAnalytics, identifyAuthenticatedUser } from '@/lib/analytics'
import { supabase } from '@/lib/supabase'

/**
 * Hook to initialize analytics and track user identification
 * Must be called in a client component at app load
 */
export function useAnalytics() {
  useEffect(() => {
    // Initialize GA4 with anonymous ID
    initializeAnalytics()

    // Check if user is already authenticated and identify them
    if (!supabase) return

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && supabase) {
        // Get profile info for additional context
        supabase
          .from('profiles')
          .select('email, role, business_name')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            identifyAuthenticatedUser(user.id, {
              email: profile?.email || user.email || undefined,
              role: profile?.role,
              businessName: profile?.business_name,
            })
          })
      }
    })
  }, [])
}
