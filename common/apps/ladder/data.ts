import {
  addDoc,
  collection,
  deleteField,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type FieldValue,
} from 'firebase/firestore'
import { getDownloadURL, ref } from 'firebase/storage'
import { getDb, getFirebaseStorage } from '@/common/firebase/client'
import { profileFromDoc, type ProfileFields, type ProfileHistoryEntry } from './profile'
import type { CompanyDoc, JobDoc, RequestDoc, RequestType, Tracker, UserJobField } from './types'

// Client reads and writes for ladder. Rules (firebase/rules/ladder.rules) allow a client to change
// only the user-editable job fields and the profile, and to queue requests; everything else is written by the
// migration script and the Mac worker with the admin SDK.

type Unsubscribe = () => void

function toDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null
}

export function subscribeJobs(
  tracker: Tracker,
  onData: (jobs: JobDoc[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getDb(), 'ladder', tracker, 'jobs'),
    (snap) => onData(snap.docs.map((d) => ({ body_html: '', ...d.data(), slug: d.id, tracker }) as JobDoc)),
    onError,
  )
}

export function subscribeCompanies(
  tracker: Tracker,
  onData: (companies: CompanyDoc[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getDb(), 'ladder', tracker, 'companies'),
    (snap) => onData(snap.docs.map((d) => ({ body_html: '', ...d.data(), slug: d.id, tracker }) as CompanyDoc)),
    onError,
  )
}

/** The most recent requests, newest first; enough to show what is pending or just failed. */
export function subscribeRequests(
  tracker: Tracker,
  onData: (requests: RequestDoc[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(getDb(), 'ladder', tracker, 'requests'), orderBy('createdAt', 'desc'), limit(200))
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            type: data.type,
            status: data.status,
            slug: data.slug,
            createdBy: data.createdBy,
            createdAt: toDate(data.createdAt),
            finishedAt: toDate(data.finishedAt),
            error: data.error ?? null,
            ...(typeof data.result?.pdf === 'string' ? { pdf: data.result.pdf } : {}),
          }
        }),
      ),
    onError,
  )
}


/** A change to user-editable fields. `null` removes the field (for example clearing a rating). */
export type JobPatch = { [K in UserJobField]?: JobDoc[K] | null }

export async function updateJob(tracker: Tracker, slug: string, patch: JobPatch): Promise<void> {
  const data: Record<string, unknown | FieldValue> = { updated_at: serverTimestamp() }
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) data[key] = value === null ? deleteField() : value
  }
  await updateDoc(doc(getDb(), 'ladder', tracker, 'jobs', slug), data)
}

export async function createRequest(
  tracker: Tracker,
  type: RequestType,
  uid: string,
  slug?: string,
): Promise<void> {
  await addDoc(collection(getDb(), 'ladder', tracker, 'requests'), {
    type,
    status: 'queued',
    ...(slug ? { slug } : {}),
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
}

/** Download URL for a generated PDF (Storage path from resume_pdf etc.); needs read access. */
export function fileUrl(path: string): Promise<string> {
  return getDownloadURL(ref(getFirebaseStorage(), path))
}

const profileRef = (tracker: Tracker) => doc(getDb(), 'ladder', tracker, 'profile', 'current')

/** The tracker profile's fields, or null before anyone has saved one. */
export function subscribeProfile(
  tracker: Tracker,
  onData: (profile: ProfileFields | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(profileRef(tracker), (snap) => onData(snap.exists() ? profileFromDoc(snap.data()) : null), onError)
}

/** Earlier resume versions, newest first. */
export function subscribeProfileHistory(
  tracker: Tracker,
  onData: (entries: ProfileHistoryEntry[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(profileRef(tracker), 'history'), orderBy('savedAt', 'desc'), limit(50))
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs.map((d) => {
          const data = d.data()
          return { id: d.id, resumeTex: data.resumeTex, savedAt: toDate(data.savedAt), savedBy: data.savedBy }
        }),
      ),
    onError,
  )
}

/**
 * Writes the whole profile (the rules require every field). When resumeTex changed it also adds a
 * history version, in the same batch so a version exists for every saved resume.
 */
export async function saveProfile(
  tracker: Tracker,
  uid: string,
  profile: ProfileFields,
  resumeChanged: boolean,
): Promise<void> {
  const batch = writeBatch(getDb())
  batch.set(profileRef(tracker), { ...profile, updatedAt: serverTimestamp(), updatedBy: uid })
  if (resumeChanged) {
    batch.set(doc(collection(profileRef(tracker), 'history')), {
      resumeTex: profile.resumeTex,
      savedAt: serverTimestamp(),
      savedBy: uid,
    })
  }
  await batch.commit()
}
