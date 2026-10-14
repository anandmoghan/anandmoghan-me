// Reading history: users/{uid}/reads/{readId}. Written only while consent is 'granted'.
// A slug is a post slug or materials:<page>[/<chapter>]; the doc id swaps '/' for '__'.

export const FINISHED = 0.9;

export interface ReadEntry {
  slug: string;
  title: string;
  progress: number;
  lastHeadingId: string;
  lastReadAt: Date;
}

export function readDocId(slug: string): string {
  return slug.replace(/\//g, '__');
}

export function materialsSlug(page: string, chapter: string | null): string {
  return chapter ? `materials:${page}/${chapter}` : `materials:${page}`;
}

/** Where a read resumes: the post or materials route, plus the heading it stopped at. */
export function readHref(entry: Pick<ReadEntry, 'slug' | 'lastHeadingId'>): string {
  const hash = entry.lastHeadingId ? `#${entry.lastHeadingId}` : '';
  if (entry.slug.startsWith('materials:')) {
    return `/apps/materials/${entry.slug.slice('materials:'.length)}${hash}`;
  }
  return `/posts/${entry.slug}${hash}`;
}
