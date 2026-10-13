import { defineSecret } from 'firebase-functions/params'

// Region for every function. Hosting rewrites must name the same region.
// The Firestore location is not recorded in the repo; match it here if it differs.
export const REGION = 'europe-west2'

export const ENCRYPTION_SECRET = defineSecret('ENCRYPTION_SECRET')

export const SYNC_RATE_LIMIT_PER_MINUTE = 5
