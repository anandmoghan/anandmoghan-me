import type { PostHeading } from './post';

// Shape of content/materials/pages/<page>/page.json.
export interface MaterialsPageJson {
  title: string;
  description?: string;
  order: number;
  chapters: string[]; // chapter folder names in reading order
}

// Shape of content/materials/pages/<page>/<chapter>/chapter.json.
export interface MaterialsChapterJson {
  title: string;
  summary?: string;
}

export interface MaterialsChapterMeta {
  slug: string; // chapter folder name
  number: number; // 1-based position in the page
  title: string;
  summary: string;
  sectionCount: number;
}

export interface MaterialsPage {
  slug: string;
  title: string;
  description: string;
  order: number;
  chapters: MaterialsChapterMeta[];
}

export interface MaterialsChapter extends MaterialsChapterMeta {
  html: string;
  headings: PostHeading[];
}

// Storage materials/index.json, written by scripts/publish-materials.ts. Only admins and users
// with the materials app can read it; the static build ships none of this.
export interface MaterialsSection {
  id: string;
  text: string;
}

export interface MaterialsIndexChapter extends MaterialsChapterMeta {
  /** The chapter's h2 sections, for the sidebar. */
  sections: MaterialsSection[];
}

export interface MaterialsIndexPage extends Omit<MaterialsPage, 'chapters'> {
  chapters: MaterialsIndexChapter[];
}

export interface MaterialsIndex {
  generatedAt: string;
  pages: MaterialsIndexPage[];
}
