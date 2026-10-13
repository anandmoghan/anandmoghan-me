# CI/CD

Workflows live in `.github/workflows/`.

## deploy.yml (Deploy to Firebase)

| Trigger | Job | What it does |
|---|---|---|
| Pull request to `main` | `preview` | `npm ci`, `npm run build`, then `FirebaseExtended/action-hosting-deploy@v0` deploys to a preview channel and comments the URL on the PR (expires in 7 days). |
| Push to `main`, manual | `production` | Installs root and `functions/` dependencies, builds the site, then `firebase deploy --only hosting,functions,firestore,storage` with the service account in `GOOGLE_APPLICATION_CREDENTIALS`. The `functions` predeploy step compiles `functions/` with `tsc`. |

Concurrent runs for the same ref queue rather than cancel.

## health-check.yml

Hourly and after each "Deploy to Firebase" run: checks `anandmoghan.me`, `/posts`, `/media`, `/profile`, sitemap, robots, response time, and SSL expiry. Fails the job when a page is not 200.

## Secrets

Repository secrets (Settings, Secrets and variables, Actions):

| Secret | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON (see below) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `anandmoghan-me` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `anandmoghan-me.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app config |
| `NEXT_PUBLIC_GA_ID` | Google Analytics measurement ID |

`ENCRYPTION_SECRET` is a Functions secret in Secret Manager (set with `firebase functions:secrets:set`), not a GitHub secret.

The service account needs these roles: Firebase Hosting Admin, Cloud Functions Admin, Service Account User, Firebase Rules Admin, Cloud Datastore Index Admin (if indexes are deployed), Secret Manager Viewer, Artifact Registry Writer, and Cloud Build Editor. Easiest path: run `firebase init hosting:github` once, which creates a service account and the secret for Hosting, then add the extra roles in IAM and replace the secret with the full JSON key.

## Rollback

There is no rollback workflow. See "Rollback" in [DEPLOYMENT.md](DEPLOYMENT.md): console release history, or `firebase hosting:clone`.

## Local equivalents

```bash
npm run build && npx firebase hosting:channel:deploy preview   # PR preview
npm run deploy:all                                              # production
```
