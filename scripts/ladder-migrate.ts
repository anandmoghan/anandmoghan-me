// One-off migration of the markdown ladder trackers into Firestore and Storage.
//
//   ~/workspace/code/ladder/content        -> tracker anand
//   ~/workspace/code/ladder-kavya/content  -> tracker kavya
//
// Both repos are read only. For each tracker:
//   content/jobs/<slug>.md         -> ladder/{tracker}/jobs/{slug}   (frontmatter fields + body_html)
//   content/companies/<slug>.md    -> ladder/{tracker}/companies/{slug}
//   content/resume/base.md         -> ladder/{tracker}.resume_html
//   content/{resume,cover-letter}/generated/<slug>/*.{pdf,tex}
//                                  -> Storage ladder/{tracker}/generated/<slug>/<file>
// resume_pdf, resume_tex, cover_letter_pdf and cover_letter_tex are rewritten to those Storage
// paths. Field names and shapes follow anandmoghan-me-apis/ladder/schema.mjs: frontmatter fields
// outside lib/jobs/types.ts are dropped (and counted), YAML dates become YYYY-MM-DD strings, and
// markdown bodies become HTML sanitised with the same allowlist as anandmoghan-me-apis/ladder/html.mjs.
// Documents are written with set(), so a rerun replaces them (including any edits made in the app).
//
// Usage (prints counts and field names only, never job contents):
//   npm run ladder-migrate -- --dry-run                  parse and count, write nothing
//   npm run ladder-migrate                               emulators (firebase.json ports), project
//                                                        demo-anandmoghan-me
//   npm run ladder-migrate -- --tracker kavya            one tracker only
//   npm run ladder-migrate -- --production               the live project (phase 2 cutover only;
//                                                        needs GOOGLE_APPLICATION_CREDENTIALS)
// Source folders can be overridden with --anand-dir and --kavya-dir.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import dotenv from 'dotenv'
import matter from 'gray-matter'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { TRACKER_CONFIG } from '../common/apps/ladder/trackers'
import { TRACKERS, type Tracker } from '../common/apps/ladder/types'

const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true })

const CODE_DIR = path.join(os.homedir(), 'workspace', 'code')
const EMULATOR_PROJECT = 'demo-anandmoghan-me'
const PRODUCTION_PROJECT = 'anandmoghan-me'

// == Sanitising (same options as anandmoghan-me-apis/ladder/html.mjs) ==

const SANITISE: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'a',
    'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: { a: ['href', 'rel', 'target'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    h1: 'h2',
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer nofollow', target: '_blank' },
    }),
  },
  exclusiveFilter: (frame) => ['p', 'li'].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren?.length,
}

function markdownToHtml(markdown: string): string {
  // lexer + parser is the synchronous path (marked.parse is typed as string | Promise).
  const html = marked.parser(marked.lexer(markdown, { gfm: true }))
  return sanitizeHtml(html, SANITISE).trim()
}

// == Field model (lib/jobs/types.ts, lib/companies/types.ts) ==

type Kind = 'string' | 'currency' | 'url' | 'date' | 'bool' | 'number' | 'int' | 'strings' | 'list' | readonly string[]

const CONFIDENCE = ['confirmed', 'inferred', 'unknown'] as const
const SPONSORSHIP = ['yes', 'no', 'unknown'] as const

function jobFields(tracker: Tracker): Record<string, Kind> {
  const config = TRACKER_CONFIG[tracker]
  const scopes = [config.hiringScope.restricted, ...Object.keys(config.hiringScope.labels), 'unclear']
  return {
    title: 'string',
    company: 'string',
    url: 'url',
    status: ['new', 'saved', 'applied', 'interviewing', 'declined', 'archived'],
    discovered_date: 'date',
    viewed: 'bool',
    apply_url: 'url',
    source: ['linkedin', 'company_site', 'referral', 'other'],
    location: 'string',
    remote: ['remote', 'hybrid', 'onsite', 'unknown'],
    applied_date: 'date',
    decision_date: 'date',
    progress_stage: ['applied', 'online_assessment', 'phone_screen', 'onsite', 'offer', 'declined'],
    rating: ['up', 'down'],
    tags: 'strings',
    sponsorship: SPONSORSHIP,
    sponsorship_confidence: CONFIDENCE,
    sponsorship_source: 'string',
    pay_min: 'number',
    pay_max: 'number',
    pay_currency: 'currency',
    pay_period: ['year', 'hour'],
    pay_confidence: CONFIDENCE,
    pay_source: 'string',
    fit_summary: 'string',
    products: 'string',
    products_source: 'string',
    funding_notes: 'string',
    funding_source: 'string',
    financials_notes: 'string',
    financials_source: 'string',
    region: config.regions.map((r) => r.value),
    hiring_scope: scopes,
    hiring_scope_confidence: CONFIDENCE,
    applicant_count: 'int',
    applicant_count_label: 'string',
    resume_requested: 'bool',
    resume_pdf: 'string',
    resume_tex: 'string',
    cover_letter_requested: 'bool',
    cover_letter_pdf: 'string',
    cover_letter_tex: 'string',
    apply_prep: 'list',
    notes: 'list',
    email_threads: 'list',
    refresh_requested: 'bool',
    last_refreshed_date: 'date',
  }
}

const REQUIRED_JOB = ['title', 'company', 'url', 'status', 'discovered_date']

const COMPANY_FIELDS: Record<string, Kind> = {
  name: 'string',
  career_page_url: 'url',
  ats: ['greenhouse', 'ashby', 'lever', 'workday', 'other', 'unknown'],
  tags: 'strings',
  regions: 'strings',
  last_verified_date: 'date',
  notes: 'string',
  products: 'string',
  products_source: 'string',
  funding_notes: 'string',
  funding_source: 'string',
  financials_notes: 'string',
  financials_source: 'string',
  sponsorship: SPONSORSHIP,
  sponsorship_confidence: CONFIDENCE,
  sponsorship_source: 'string',
}

const REQUIRED_COMPANY = ['name', 'career_page_url']

/** YAML parses an unquoted 2026-09-05 as a Date; the model stores YYYY-MM-DD strings. */
function isoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim()
  return null
}

/** Dates nested in notes, email threads and apply prep become strings too. */
function plainValue(value: unknown): unknown {
  if (value instanceof Date) return isoDate(value)
  if (Array.isArray(value)) return value.map(plainValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, plainValue(v)]),
    )
  }
  return value
}

/** The value to store, or undefined when it does not fit the field. */
function coerce(kind: Kind, value: unknown): unknown {
  if (Array.isArray(kind)) return typeof value === 'string' && kind.includes(value) ? value : undefined
  switch (kind) {
    case 'string':
      return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined
    case 'currency':
      return typeof value === 'string' && /^[A-Z]{3}$/.test(value.trim()) ? value.trim() : undefined
    case 'url':
      return typeof value === 'string' && /^https?:\/\//.test(value.trim()) ? value.trim() : undefined
    case 'date':
      return isoDate(value) ?? undefined
    case 'bool':
      return typeof value === 'boolean' ? value : undefined
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
    case 'int':
      return Number.isInteger(value) && (value as number) >= 0 ? value : undefined
    case 'strings':
      return Array.isArray(value) && value.every((v) => typeof v === 'string') ? value : undefined
    case 'list':
      return Array.isArray(value) ? plainValue(value) : undefined
    default:
      return undefined
  }
}

// == Counting (field names only, never values) ==

class Tally {
  private counts = new Map<string, number>()
  add(key: string) {
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1)
  }
  lines(): string[] {
    return [...this.counts.entries()].sort().map(([k, n]) => `${k}: ${n}`)
  }
}

interface Converted {
  id: string
  data: Record<string, unknown>
}

function convertFrontmatter(
  raw: Record<string, unknown>,
  fields: Record<string, Kind>,
  dropped: Tally,
  invalid: Tally,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue
    const kind = fields[key]
    if (!kind) {
      dropped.add(key)
      continue
    }
    const v = coerce(kind, value)
    if (v === undefined) invalid.add(key)
    else out[key] = v
  }
  return out
}

// == Reading one tracker ==

interface FileUpload {
  local: string
  dest: string
  contentType: string
}

interface TrackerData {
  jobs: Converted[]
  companies: Converted[]
  resumeHtml: string | null
  uploads: FileUpload[]
  skipped: Tally
  dropped: Tally
  invalid: Tally
  warnings: Tally
}

const JOB_FILE = /^\d{4}-\d{2}-\d{2}-.+\.md$/
const JOB_SLUG = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]{0,150}$/
const COMPANY_SLUG = /^[a-z0-9][a-z0-9-]{0,100}$/
const FILE_FIELDS = [
  ['resume_pdf', 'resume'],
  ['resume_tex', 'resume'],
  ['cover_letter_pdf', 'cover-letter'],
  ['cover_letter_tex', 'cover-letter'],
] as const

function readTracker(tracker: Tracker, contentDir: string): TrackerData {
  const result: TrackerData = {
    jobs: [],
    companies: [],
    resumeHtml: null,
    uploads: [],
    skipped: new Tally(),
    dropped: new Tally(),
    invalid: new Tally(),
    warnings: new Tally(),
  }
  const fields = jobFields(tracker)

  // Generated files: every pdf and tex under the per-job folders.
  const uploadsByLocal = new Map<string, FileUpload>()
  for (const kind of ['resume', 'cover-letter']) {
    const generated = path.join(contentDir, kind, 'generated')
    if (!fs.existsSync(generated)) continue
    for (const slug of fs.readdirSync(generated)) {
      const dir = path.join(generated, slug)
      if (!fs.statSync(dir).isDirectory()) continue
      for (const file of fs.readdirSync(dir)) {
        const ext = path.extname(file).toLowerCase()
        if (ext !== '.pdf' && ext !== '.tex') continue
        const dest = `ladder/${tracker}/generated/${slug}/${file}`
        if ([...uploadsByLocal.values()].some((u) => u.dest === dest)) {
          result.warnings.add('generated file name clash (resume and cover letter), skipped')
          continue
        }
        const local = path.join(dir, file)
        uploadsByLocal.set(path.resolve(local), {
          local,
          dest,
          contentType: ext === '.pdf' ? 'application/pdf' : 'application/x-tex',
        })
      }
    }
  }
  result.uploads = [...uploadsByLocal.values()]

  const jobsDir = path.join(contentDir, 'jobs')
  for (const file of fs.readdirSync(jobsDir).filter((f) => JOB_FILE.test(f)).sort()) {
    const slug = file.replace(/\.md$/, '')
    const { data: raw, content } = matter(fs.readFileSync(path.join(jobsDir, file), 'utf-8'))
    const data = convertFrontmatter(raw, fields, result.dropped, result.invalid)
    const missing = REQUIRED_JOB.filter((k) => !(k in data))
    if (missing.length) {
      result.skipped.add(`job missing ${missing.join(', ')}`)
      continue
    }
    if (!JOB_SLUG.test(slug)) result.warnings.add('job slug outside the apis JOB_SLUG pattern')
    if (!slug.startsWith(`${data.discovered_date}-`)) result.warnings.add('discovered_date differs from slug date')

    for (const [field] of FILE_FIELDS) {
      const ref = data[field]
      if (typeof ref !== 'string') continue
      const upload = uploadsByLocal.get(path.resolve(path.dirname(contentDir), ref.trim()))
      if (upload) {
        data[field] = upload.dest
      } else {
        delete data[field]
        result.warnings.add(`${field} points to a missing file, field dropped`)
      }
    }

    result.jobs.push({ id: slug, data: { ...data, slug, tracker, body_html: markdownToHtml(content) } })
  }

  const companiesDir = path.join(contentDir, 'companies')
  if (fs.existsSync(companiesDir)) {
    for (const file of fs.readdirSync(companiesDir).filter((f) => f.endsWith('.md') && f !== 'CLAUDE.md').sort()) {
      const slug = file.replace(/\.md$/, '')
      const { data: raw, content } = matter(fs.readFileSync(path.join(companiesDir, file), 'utf-8'))
      const data = convertFrontmatter(raw, COMPANY_FIELDS, result.dropped, result.invalid)
      const missing = REQUIRED_COMPANY.filter((k) => !(k in data))
      if (missing.length) {
        result.skipped.add(`company missing ${missing.join(', ')}`)
        continue
      }
      if (!COMPANY_SLUG.test(slug)) result.warnings.add('company slug outside the apis COMPANY_SLUG pattern')
      result.companies.push({ id: slug, data: { ...data, slug, tracker, body_html: markdownToHtml(content) } })
    }
  }

  const resume = path.join(contentDir, 'resume', 'base.md')
  if (fs.existsSync(resume)) result.resumeHtml = markdownToHtml(fs.readFileSync(resume, 'utf-8'))

  return result
}

function report(tracker: Tracker, data: TrackerData) {
  const pdfs = data.uploads.filter((u) => u.contentType === 'application/pdf').length
  console.log(`\n[${tracker}]`)
  console.log(`  jobs: ${data.jobs.length}`)
  console.log(`  companies: ${data.companies.length}`)
  console.log(`  base resume: ${data.resumeHtml ? 'yes' : 'no'}`)
  console.log(`  generated files: ${data.uploads.length} (${pdfs} pdf, ${data.uploads.length - pdfs} tex)`)
  console.log(`  jobs with resume_pdf: ${data.jobs.filter((j) => j.data.resume_pdf).length}`)
  console.log(`  jobs with cover_letter_pdf: ${data.jobs.filter((j) => j.data.cover_letter_pdf).length}`)
  for (const [label, tally] of [
    ['skipped', data.skipped],
    ['dropped fields (not in lib/jobs/types.ts)', data.dropped],
    ['invalid values dropped', data.invalid],
    ['warnings', data.warnings],
  ] as const) {
    const lines = tally.lines()
    if (lines.length) console.log(`  ${label}:\n${lines.map((l) => `    ${l}`).join('\n')}`)
  }
}

// == Writing ==

async function write(tracker: Tracker, data: TrackerData, projectId: string, bucketName: string) {
  const db = getFirestore()
  const writer = db.bulkWriter()
  let failures = 0
  writer.onWriteError((err) => {
    failures += 1
    console.error(`  write failed: ${err.documentRef.path}: ${err.code}`)
    return false
  })
  const stamp = { created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() }
  const root = db.collection('ladder').doc(tracker)
  // Failures are counted by onWriteError; the per-write promises only need a handler.
  const ignore = () => undefined
  writer.set(root, { resume_html: data.resumeHtml ?? '', updated_at: FieldValue.serverTimestamp() }, { merge: true }).catch(ignore)
  for (const job of data.jobs) writer.set(root.collection('jobs').doc(job.id), { ...job.data, ...stamp }).catch(ignore)
  for (const company of data.companies) {
    writer.set(root.collection('companies').doc(company.id), { ...company.data, ...stamp }).catch(ignore)
  }
  await writer.close()

  const bucket = getStorage().bucket(bucketName)
  for (const upload of data.uploads) {
    await bucket.file(upload.dest).save(fs.readFileSync(upload.local), {
      contentType: upload.contentType,
      resumable: false,
      metadata: { cacheControl: 'private, max-age=0' },
    })
  }
  console.log(
    `  wrote ${data.jobs.length} jobs, ${data.companies.length} companies, ${data.uploads.length} files ` +
      `to ${projectId} (${failures} write failures)`,
  )
  if (failures) process.exitCode = 1
}

async function main() {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      production: { type: 'boolean', default: false },
      tracker: { type: 'string' },
      'anand-dir': { type: 'string', default: path.join(CODE_DIR, 'ladder', 'content') },
      'kavya-dir': { type: 'string', default: path.join(CODE_DIR, 'ladder-kavya', 'content') },
    },
  })
  const trackers: Tracker[] = values.tracker ? [values.tracker as Tracker] : [...TRACKERS]
  if (!trackers.every((t) => TRACKERS.includes(t))) throw new Error(`--tracker must be ${TRACKERS.join(' or ')}`)
  const dirs: Record<Tracker, string> = { anand: values['anand-dir'] as string, kavya: values['kavya-dir'] as string }

  let projectId = ''
  let bucketName = ''
  if (!values['dry-run']) {
    if (values.production) {
      if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
        throw new Error('--production with emulator variables set; unset FIRESTORE_EMULATOR_HOST and FIREBASE_STORAGE_EMULATOR_HOST.')
      }
      projectId = PRODUCTION_PROJECT
      bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${PRODUCTION_PROJECT}.appspot.com`
    } else {
      process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8181'
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199'
      projectId = process.env.GCLOUD_PROJECT || EMULATOR_PROJECT
      bucketName = process.env.LADDER_EMULATOR_BUCKET || `${projectId}.appspot.com`
    }
    initializeApp({ projectId, storageBucket: bucketName })
    console.log(`target: ${values.production ? 'PRODUCTION' : 'emulator'} project ${projectId}, bucket ${bucketName}`)
  } else {
    console.log('dry run: nothing is written')
  }

  for (const tracker of trackers) {
    const data = readTracker(tracker, dirs[tracker])
    report(tracker, data)
    if (!values['dry-run']) await write(tracker, data, projectId, bucketName)
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
