/**
 * Google Analytics utility functions
 * 
 * Use these functions to track custom events in your application.
 */

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
  }
}

/**
 * Track a custom event
 * 
 * @example
 * trackEvent('click', 'CTA', 'Contact Button')
 * trackEvent('download', 'Resume', 'PDF', 1)
 */
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

/**
 * Track an outbound link click
 * 
 * @example
 * trackOutboundLink('https://linkedin.com/in/anandmoghan', 'LinkedIn Profile')
 */
export const trackOutboundLink = (url: string, label?: string) => {
  trackEvent('click', 'Outbound Link', label || url);
};

/**
 * Track a page view (usually handled automatically by Next.js)
 * 
 * @example
 * trackPageView('/posts/my-article')
 */
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
      page_path: url,
    });
  }
};

/**
 * Track a file download
 * 
 * @example
 * trackDownload('resume.pdf', 'Resume')
 */
export const trackDownload = (filename: string, label?: string) => {
  trackEvent('download', 'File', label || filename);
};

/**
 * Track a form submission
 * 
 * @example
 * trackFormSubmit('contact-form', 'Contact Form')
 */
export const trackFormSubmit = (formId: string, label?: string) => {
  trackEvent('submit', 'Form', label || formId);
};

/**
 * Track social media clicks
 * 
 * @example
 * trackSocialClick('LinkedIn', 'Profile Link')
 */
export const trackSocialClick = (platform: string, label?: string) => {
  trackEvent('click', 'Social Media', `${platform}${label ? ` - ${label}` : ''}`);
};

/**
 * Track search queries
 * 
 * @example
 * trackSearch('machine learning')
 */
export const trackSearch = (searchTerm: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search', {
      search_term: searchTerm,
    });
  }
};

/**
 * Track video interactions
 * 
 * @example
 * trackVideo('play', 'Introduction Video')
 * trackVideo('complete', 'Tutorial Video')
 */
export const trackVideo = (action: 'play' | 'pause' | 'complete', videoTitle: string) => {
  trackEvent(action, 'Video', videoTitle);
};

/**
 * Track scroll depth
 * 
 * @example
 * trackScrollDepth(25) // User scrolled 25% of page
 * trackScrollDepth(50)
 * trackScrollDepth(75)
 * trackScrollDepth(100)
 */
export const trackScrollDepth = (percentage: number) => {
  trackEvent('scroll', 'Scroll Depth', `${percentage}%`, percentage);
};

/**
 * Track time on page (call when user leaves)
 * 
 * @example
 * trackTimeOnPage(120) // User spent 120 seconds on page
 */
export const trackTimeOnPage = (seconds: number) => {
  trackEvent('timing', 'Time on Page', undefined, seconds);
};

/**
 * Track redirect source from URL parameter
 * 
 * @example
 * trackRedirectSource('apple')
 * trackRedirectSource('linkedin')
 */
export const trackRedirectSource = (source: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'utm_source_visit', {
      utm_source: source,
      page_path: window.location.pathname,
    });
  }
};
