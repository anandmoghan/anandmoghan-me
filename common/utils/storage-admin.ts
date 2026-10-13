import fs from 'fs';
import os from 'os';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getStorageBucket } from './media-client';

export type MediaBucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

/**
 * True when application default credentials can be found without probing the network:
 * GOOGLE_APPLICATION_CREDENTIALS, or the file written by `gcloud auth application-default login`.
 */
export function hasStorageCredentials(): boolean {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return true;
  const gcloudAdc = path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  return fs.existsSync(gcloudAdc);
}

/**
 * The media bucket via firebase-admin (application default credentials).
 * Server and scripts only.
 */
export function getMediaBucket(): MediaBucket {
  const app =
    getApps().find((existing) => existing.name === 'media') ??
    initializeApp(
      { credential: applicationDefault(), storageBucket: getStorageBucket() },
      'media'
    );
  return getStorage(app).bucket();
}
