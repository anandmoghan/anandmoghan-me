'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Badge } from '../../shell/Badge'
import { TagList } from '../components/badges'
import { CompanyInfoCard, JobHistoryList, SectionTitle } from '../components/CompanyInfo'
import { useLadder } from '../LadderProvider'
import { companyHistory, formatDate } from '../lib'

// One company: /apps/ladder/company?slug=<slug>.
export function CompanyPage() {
  const { companies, jobs } = useLadder()
  const slug = useSearchParams().get('slug')
  const company = slug ? companies.find((c) => c.slug === slug) : undefined

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-3 sm:px-6">
      <Link href="/apps/ladder/companies" className="back-link mb-3">
        Companies
      </Link>
      {!company ? (
        <p className="card text-sm text-muted">Company not found in this tracker.</p>
      ) : (
        <>
          <div className="card mb-6">
            <h1 className="text-2xl font-extrabold leading-tight">{company.name}</h1>
            {((company.tags?.length ?? 0) > 0 || (company.regions?.length ?? 0) > 0) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <TagList tags={company.tags} />
                {company.regions?.map((region) => (
                  <Badge key={region} tone="fg">
                    {region}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href={company.career_page_url} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
                View careers page
              </a>
              {company.ats && <span className="text-xs text-muted">{company.ats}</span>}
              {company.last_verified_date && (
                <span className="text-xs text-muted">Verified {formatDate(company.last_verified_date)}</span>
              )}
            </div>
            {company.notes && <p className="mt-4 whitespace-pre-wrap text-sm">{company.notes}</p>}
          </div>

          <div className="space-y-4">
            <CompanyInfoCard info={company} />
            {company.body_html && (
              // Sanitised by the writer (migration, worker); clients cannot write it.
              <div className="card prose" dangerouslySetInnerHTML={{ __html: company.body_html }} />
            )}
            <div className="card">
              <SectionTitle>Jobs at this company</SectionTitle>
              <JobHistoryList entries={companyHistory(jobs, company.name, '')} empty="No tracked jobs at this company yet" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
