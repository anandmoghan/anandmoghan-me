'use client'

import Link from 'next/link'
import { FileLink } from '../components/JobActions'
import { useLadder } from '../LadderProvider'

// The base resume (ladder/{tracker}.resume_html) and every job's generated resume and cover letter.
export function ResumePage() {
  const { trackerDoc, jobs } = useLadder()
  const withMaterials = jobs.filter((job) => job.resume_pdf || job.cover_letter_pdf)

  return (
    <div className="site-container space-y-8 pb-6 pt-3">
      <section>
        <h1 className="mb-4 text-[1.65rem] font-extrabold leading-tight">Resume</h1>
        {trackerDoc?.resume_html ? (
          // Sanitised by the migration script; clients cannot write it.
          <div className="card prose overflow-x-auto" dangerouslySetInnerHTML={{ __html: trackerDoc.resume_html }} />
        ) : (
          <p className="text-sm italic text-muted">No resume content yet.</p>
        )}
        <p className="mt-3 text-sm text-muted">
          A plain-text extraction of the canonical resume, which lives as LaTeX on the Mac and compiles to PDF.
          It is kept here so it is easy to read and search against job postings.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">Tailored materials</h2>
        {withMaterials.length === 0 ? (
          <p className="text-sm italic text-muted">No tailored resumes or cover letters yet.</p>
        ) : (
          <ul className="space-y-2">
            {withMaterials.map((job) => (
              <li key={job.slug} className="card card--compact">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={`/apps/ladder?job=${encodeURIComponent(job.slug)}`} className="min-w-0">
                    <span className="block truncate font-bold">{job.title}</span>
                    <span className="block truncate text-sm text-muted">{job.company}</span>
                  </Link>
                  <span className="flex flex-wrap gap-2">
                    {job.resume_pdf && <FileLink path={job.resume_pdf} label="Resume" />}
                    {job.cover_letter_pdf && <FileLink path={job.cover_letter_pdf} label="Cover letter" />}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
