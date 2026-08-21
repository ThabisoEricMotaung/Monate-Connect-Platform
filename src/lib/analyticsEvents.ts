/**
 * GA4 Custom Events for AiForm Procure
 * Tracks: signup, saved_search, bid_submission, supplier_db_access
 */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

export const analyticsEvents = {
  /**
   * Track user signup completion
   */
  trackSignup: (userId: string, signupMethod: string = 'email') => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'signup', {
        method: signupMethod,
        user_id: userId,
        timestamp: new Date().toISOString(),
      });
      console.log('📊 GA4: Signup event tracked', { userId, method: signupMethod });
    }
  },

  /**
   * Track when user saves a search
   */
  trackSavedSearch: (
    searchQuery: string,
    category?: string,
    location?: string
  ) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'saved_search', {
        search_query: searchQuery || 'unspecified',
        category: category || 'all',
        location: location || 'all',
        timestamp: new Date().toISOString(),
      });
      console.log('📊 GA4: Saved search event tracked', {
        query: searchQuery,
        category,
        location,
      });
    }
  },

  /**
   * Track when user submits a bid/RFQ response
   */
  trackBidSubmission: (
    tenderValue?: number,
    category?: string,
    tenderId?: string
  ) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'bid_submission', {
        tender_value: tenderValue || 0,
        category: category || 'unknown',
        tender_id: tenderId,
        timestamp: new Date().toISOString(),
      });
      console.log('📊 GA4: Bid submission event tracked', {
        value: tenderValue,
        category,
        tenderId,
      });
    }
  },

  /**
   * Track when user accesses supplier database with filters
   */
  trackSupplierDBAccess: (filters: {
    industry?: string;
    location?: string;
    bbbeeLevel?: string;
    cidbGrade?: string;
  }) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'supplier_db_access', {
        industry: filters.industry || 'all',
        location: filters.location || 'all',
        bbbee_level: filters.bbbeeLevel || 'any',
        cidb_grade: filters.cidbGrade || 'any',
        timestamp: new Date().toISOString(),
      });
      console.log('📊 GA4: Supplier DB access tracked', filters);
    }
  },

  /**
   * Track page view with custom metadata (optional, GA4 tracks auto but useful for custom)
   */
  trackPageView: (
    pagePath: string,
    pageTitle: string,
    metadata?: Record<string, string>
  ) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: pagePath,
        page_title: pageTitle,
        ...metadata,
      });
    }
  },
};
