# Deployment Guide

## Architecture

- **Firebase Hosting** (project `anandmoghan-me`, Blaze) serves the Next.js static export in `out/`, including the apps under `/apps/**`.
- **Firebase Function `api`** (region `us-central1`, source in `functions/`) serves `/api/**` through a Hosting rewrite.
- **Firestore and Storage** rules live in `firestore.rules` and `storage.rules`.
- **Media** lives in the default Storage bucket under `public/**` (see [MEDIA-SYSTEM.md](MEDIA-SYSTEM.md)).
- **Cloudflare** is DNS only.

All routing config is in `firebase.json` (`cleanUrls: true`, `trailingSlash: false`). `/posts` resolves to `out/posts.html`, `/posts/<slug>` to `out/posts/<slug>.html`, `/apps` to `out/apps.html`, and `/apps/login` to `out/apps/login.html`. Next's `out/404.html` is used for unknown routes.

## Environment

Build-time variables (local `.env`, and GitHub secrets in CI):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_GA_ID
```

Function secret (Secret Manager, not in GitHub): `ENCRYPTION_SECRET`.

```bash
npx firebase functions:secrets:set ENCRYPTION_SECRET --project anandmoghan-me
```

## Deploy commands

```bash
npm run deploy          # build + hosting only
npm run deploy:all      # build + hosting, functions, firestore rules, storage rules
npm run deploy:preview  # build + preview channel named "preview"
```

Run `npx firebase login` once. Normal deploys go through CI on push to `main` (see [CI-CD.md](CI-CD.md)).

## Custom domain (anandmoghan.me)

1. Firebase console, Hosting, Add custom domain, enter `anandmoghan.me`. Repeat for `www.anandmoghan.me` and choose to redirect it to the apex.
2. Firebase shows a TXT verification record and the A records (or CNAME) to use. Add exactly what it shows at Cloudflare DNS:
   - `TXT` on `anandmoghan.me` with the `hosting-site=...` value Firebase gives.
   - `A` on `anandmoghan.me` pointing at the IPv4 address(es) Firebase gives.
   - `CNAME` on `www` pointing at `anandmoghan-me.web.app` (if www is used).
3. Set every record to **DNS only** (grey cloud), not proxied, so Firebase can issue the certificate.
4. Remove the old Cloudflare Pages records (CNAME to `*.pages.dev`) for the apex, `www`, and `apps`.
5. Wait for the certificate to show Connected (minutes to a few hours).
6. Firebase console, Authentication, Settings, Authorized domains: add `anandmoghan.me` (and `www.anandmoghan.me`). `anandmoghan-me.web.app` and `.firebaseapp.com` are present by default.

`apps.anandmoghan.me` is retired with no redirect: delete its DNS record and its Pages project.

## Rollback

Hosting keeps release history.

- Console: Hosting, Release history, hover the previous release, Rollback.
- CLI: `npx firebase hosting:clone anandmoghan-me:<channel> anandmoghan-me:live` to publish a preview channel as live.
- Functions and rules have no one-click rollback: revert the commit and redeploy.
