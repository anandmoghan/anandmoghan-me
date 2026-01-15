# Google Analytics Setup Guide

This guide will help you set up Google Analytics 4 (GA4) for your website.

## Step 1: Create a Google Analytics Account

1. Go to [Google Analytics](https://analytics.google.com/)
2. Sign in with your Google account
3. Click "Start measuring" or "Admin" (gear icon)
4. Create a new account:
   - Account name: "Anand Mohan Personal Site" (or your preference)
   - Configure data sharing settings as desired
   - Click "Next"

## Step 2: Create a Property

1. Property name: "anandmoghan.me"
2. Reporting time zone: Select your timezone (e.g., "United Kingdom")
3. Currency: GBP (or your preference)
4. Click "Next"

## Step 3: Set Up Data Stream

1. Select platform: **Web**
2. Website URL: `https://anandmoghan.me`
3. Stream name: "anandmoghan.me - Production"
4. Click "Create stream"

## Step 4: Get Your Measurement ID

After creating the stream, you'll see your **Measurement ID** in the format:
```
G-XXXXXXXXXX
```

Copy this ID - you'll need it for the next step.

## Step 5: Configure Your Website

1. Create a `.env.local` file in your project root (if it doesn't exist):
   ```bash
   cp .env.example .env.local
   ```

2. Add your Google Analytics Measurement ID to `.env.local`:
   ```env
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```
   Replace `G-XXXXXXXXXX` with your actual Measurement ID.

3. **Important**: Never commit `.env.local` to git (it's already in `.gitignore`)

## Step 6: Deploy Your Site

After adding the GA ID to your `.env.local`:

1. Test locally:
   ```bash
   npm run dev
   ```
   Open your browser's developer tools → Network tab → Filter by "gtag" to verify the script loads

2. Build and deploy:
   ```bash
   npm run build
   ```
   Deploy the `out` folder to your hosting provider

3. For Cloudflare Pages, add the environment variable:
   - Go to your Cloudflare Pages project
   - Settings → Environment variables
   - Add: `NEXT_PUBLIC_GA_ID` = `G-XXXXXXXXXX`
   - Redeploy your site

## Step 7: Verify Installation

1. Visit your live website
2. Open Google Analytics → Reports → Realtime
3. You should see your visit appear within a few seconds

## What Gets Tracked

The implementation tracks:
- **Page views**: Automatically tracked on every page
- **User sessions**: How long users stay on your site
- **Traffic sources**: Where visitors come from
- **Device information**: Desktop, mobile, tablet
- **Geographic data**: Country, city (approximate)
- **Page performance**: Load times and user engagement

## Privacy Considerations

The current implementation:
- ✅ Uses Google Analytics 4 (GDPR-friendly)
- ✅ Only loads when GA_ID is configured
- ✅ Uses `afterInteractive` strategy (doesn't block page load)
- ⚠️ Does not include cookie consent banner (consider adding for EU visitors)

### Adding Cookie Consent (Optional)

If you have EU visitors, consider adding a cookie consent banner. Popular options:
- [CookieYes](https://www.cookieyes.com/)
- [Osano](https://www.osano.com/)
- [react-cookie-consent](https://www.npmjs.com/package/react-cookie-consent)

## Troubleshooting

### Analytics not showing data?

1. **Check the Measurement ID**: Verify it's correct in `.env.local`
2. **Check browser console**: Look for any errors related to gtag
3. **Disable ad blockers**: They often block Google Analytics
4. **Wait 24-48 hours**: Some reports take time to populate
5. **Use Realtime reports**: These update immediately

### Testing in development

Google Analytics works in development mode, but you might want to disable it:

```typescript
// In app/layout.tsx, modify the condition:
{gaId && process.env.NODE_ENV === 'production' && <GoogleAnalytics gaId={gaId} />}
```

## Advanced Configuration

### Track Custom Events

Create a utility file `lib/analytics.ts`:

```typescript
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};
```

Use it in your components:

```typescript
import { trackEvent } from '@/lib/analytics';

// Track button clicks
<button onClick={() => trackEvent('click', 'CTA', 'Contact Button')}>
  Contact Me
</button>

// Track downloads
<a 
  href="/resume.pdf" 
  onClick={() => trackEvent('download', 'Resume', 'PDF')}
>
  Download Resume
</a>
```

### Track Outbound Links

```typescript
export const trackOutboundLink = (url: string, label?: string) => {
  trackEvent('click', 'Outbound Link', label || url);
};
```

## Resources

- [Google Analytics 4 Documentation](https://support.google.com/analytics/answer/10089681)
- [Next.js Analytics Guide](https://nextjs.org/docs/app/building-your-application/optimizing/analytics)
- [GA4 Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/events)

## Support

If you encounter issues:
1. Check the [Google Analytics Help Center](https://support.google.com/analytics)
2. Review the [Next.js documentation](https://nextjs.org/docs)
3. Check browser console for errors
