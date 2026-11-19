'use client'

import Link from 'next/link'
import { FileLink } from '../components/JobActions'
import { useLadder } from '../LadderProvider'

// Every job's tailored resume and cover letter. The resume source itself is on the Profile page.
export function ResumePage() {
  const { jobs } = useLadder()
  const withMaterials = jobs.filter((job) => job.resume_pdf || job.cover_letter_pdf)

  return (
    <div className="site-container site-container--wide space-y-8 pb-6 pt-3">
      <section>
        <h1 className="mb-4 text-[1.65rem] font-extrabold leading-tight">Resume</h1>
        <p className="text-sm text-muted">
          The resume LaTeX, its versions and the PDF build are on the{' '}
          <Link href="/apps/ladder/profile" className="font-bold text-domain hover:underline">
            Profile
          </Link>{' '}
          page.
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
