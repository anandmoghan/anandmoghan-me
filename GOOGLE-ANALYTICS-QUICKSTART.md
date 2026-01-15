# Google Analytics - Quick Start

## 🚀 Quick Setup (5 minutes)

### 1. Get Your Google Analytics ID

1. Go to https://analytics.google.com/
2. Create account → Create property → Add data stream (Web)
3. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### 2. Add to Your Project

Create `.env.local` file in project root:

```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual ID.

### 3. Deploy

**For Cloudflare Pages:**
1. Go to your project → Settings → Environment variables
2. Add: `NEXT_PUBLIC_GA_ID` = `G-XXXXXXXXXX`
3. Redeploy

**For other hosts:**
- Add the environment variable in your hosting dashboard
- Redeploy your site

### 4. Verify

1. Visit your live site
2. Open Google Analytics → Reports → Realtime
3. You should see your visit within seconds ✅

## 📊 What's Tracked

- Page views (automatic)
- User sessions
- Traffic sources
- Device types
- Geographic location
- Page performance

## 🔒 Privacy

- Only loads when `NEXT_PUBLIC_GA_ID` is set
- Uses Google Analytics 4 (GDPR-friendly)
- Doesn't block page loading

## 📖 Full Documentation

See `docs/GOOGLE-ANALYTICS.md` for:
- Detailed setup instructions
- Custom event tracking
- Cookie consent options
- Troubleshooting guide

## ⚠️ Important

- Never commit `.env.local` to git (already in `.gitignore`)
- Test in production first (GA works in dev but may skew data)
- Consider adding cookie consent for EU visitors
