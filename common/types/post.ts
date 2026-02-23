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
  content: string;
  excerpt: string;
  publishedAt: Date;
  updatedAt: Date;
  tags: Tag[];
  author: Author;
  metadata: PostMetadata;
  published: boolean; // Whether the post is published
}

export interface PostFrontmatter {
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  author?: string;
  published?: boolean; // Default true if not specified
}
