# GitHub Actions Workflows

## deploy.yml (Deploy to Firebase)

- **Pull request to main**: builds the static export and deploys it to a Firebase Hosting preview channel (`FirebaseExtended/action-hosting-deploy@v0`). The preview URL is commented on the PR and expires after 7 days.
- **Push to main** (or manual run): builds the site and the `functions/` codebase, then runs `firebase deploy --only hosting,functions,firestore,storage` using the service account in `GOOGLE_APPLICATION_CREDENTIALS`.

Secrets: `FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_DATABASE_URL`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_GA_ID`.

## health-check.yml

Hourly check of `anandmoghan.me` (homepage, `/posts`, `/media`, `/profile`, sitemap, robots, response time, SSL expiry). Also runs after the "Deploy to Firebase" workflow completes, and on manual dispatch.

## dependabot.yml (one level up)

Dependency update PRs.

## Rollback

There is no rollback workflow. Firebase Hosting keeps release history: roll back in the console (Hosting, Release history, Rollback) or run `firebase hosting:clone anandmoghan-me:<channel-or-live> anandmoghan-me:live`. See [docs/CI-CD.md](../../docs/CI-CD.md).
