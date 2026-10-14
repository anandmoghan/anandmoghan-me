'use client'

import Link from 'next/link'
import { TagList } from '../components/badges'
import { useLadder } from '../LadderProvider'

// The company watchlist, alphabetical.
export function CompaniesPage() {
  const { companies } = useLadder()

  return (
    <div className="site-container pb-6 pt-3">
      <h1 className="mb-4 text-[1.65rem] font-extrabold leading-tight">Companies</h1>
      {companies.length === 0 ? (
        <p className="text-sm italic text-muted">No companies tracked yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <li key={company.slug}>
              <Link href={`/apps/ladder/company?slug=${encodeURIComponent(company.slug)}`} className="card card--compact tap block h-full">
                <span className="block font-bold">{company.name}</span>
                {company.tags && company.tags.length > 0 && (
                  <span className="mt-2 block">
                    <TagList tags={company.tags} />
                  </span>
                )}
                <span className="mt-2 line-clamp-2 block text-sm text-muted">
                  {company.products ?? <span className="italic">No product info yet</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
