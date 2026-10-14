import Link from 'next/link';
import type { Metadata } from 'next';
import { MATERIALS_PATH, getMaterialsPages, pageHref } from '@/common/utils/materials';
import { MaterialsShell } from './_components/MaterialsShell';
import { PaneHome } from './_components/Pane';
import { materialsMetadata } from './_components/views';

const DESCRIPTION = 'Long-form notes and preparation documents.';

export const metadata: Metadata = materialsMetadata('Materials', DESCRIPTION, MATERIALS_PATH);

// Cards for every page, ordered by page.json order.
export default function MaterialsHome() {
  const pages = getMaterialsPages();
  return (
    <MaterialsShell sidebar={<PaneHome pages={pages} />}>
      <h1>Materials</h1>
      <p className="page-lede">{DESCRIPTION}</p>
      <ul className="card-grid">
        {pages.map((page) => (
          <li key={page.slug}>
            <Link className="card" href={pageHref(page)}>
              <h2 className="card__title">{page.title}</h2>
              {page.description && <p className="card__text">{page.description}</p>}
              <p className="card__meta">
                {page.chapters.length} chapter{page.chapters.length === 1 ? '' : 's'}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </MaterialsShell>
  );
}
