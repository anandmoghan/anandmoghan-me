export interface Tag {
  id: string;
  name: string;
  category: 'official' | 'personal' | 'technical' | 'family';
  color: string;
  description?: string;
}

export interface Author {
  name: string;
  email?: string;
  avatar?: string;
}

export interface PostMetadata {
  readingTime: number;
  wordCount: number;
  hasFormulas: boolean;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: Date;
  updatedAt: Date;
  tags: Tag[];
  author: Author;
  metadata: PostMetadata;
  published: boolean; // Whether the post is published
}

export interface PostHeading {
  id: string;
  level: 2 | 3;
  text: string;
}

// A post with its rendered body, used by the post page only (lists get plain Post).
export interface PostWithContent extends Post {
  html: string;
  headings: PostHeading[];
}

// Shape of content/posts/<slug>/post.json.
export interface PostMeta {
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  author?: string;
  published?: boolean; // Default true if not specified
}
