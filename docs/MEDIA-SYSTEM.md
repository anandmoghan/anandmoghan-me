# Media System

Media is stored in the default Firebase Storage bucket (`anandmoghan-me.appspot.com`), not in the repo. Storage is the source of truth.

## Layout and access

- `public/**`: site media (images, documents). `storage.rules` allows public read and denies all client writes. Uploads use firebase-admin, which bypasses rules.
- `family/**`: private app files, readable by household members only. Not part of the site media.

## Public URL form

```
https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded key>?alt=media
```

The key is URL-encoded in full, including slashes: `public/images/a.jpg` becomes `public%2Fimages%2Fa.jpg`.

## Credentials

Scripts use firebase-admin with application default credentials:

```bash
gcloud auth application-default login
# or: GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` selects the bucket (default `anandmoghan-me.appspot.com`).

## Scripts

```bash
# Upload a directory or file (add --dry-run first to preview)
npm run upload-media -- --source ~/my-photos --type public
npm run upload-media -- --source ~/photo.jpg --type public --overwrite
npm run upload-media -- --source ~/my-photos --type public --delete-after-upload

# Rebuild the static media manifest from Storage (also runs during build)
npm run generate-manifest

# One-off: copy public/ from the old R2 bucket to Storage (dry run by default)
npm run migrate-media
npm run migrate-media -- --apply
```

`migrate-media` needs the `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` variables in `.env` (see `.env.example`). Remove them and the script after the migration is verified.

## Workflow

1. Upload with `upload-media`.
2. Run `npm run build` (the manifest is regenerated from Storage).
3. Deploy with `npm run deploy`.
