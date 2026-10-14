import fs from 'fs';
import path from 'path';
import { listSections, renderSections } from './html';
import type { Post, PostMeta, PostWithContent, Tag } from '../types/post';

const POST_CONTENT_DIR = path.join(process.cwd(), 'content/posts');

// Default tag definitions
const DEFAULT_TAGS: Record<string, Tag> = {
  'machine-learning': { id: 'machine-learning', name: 'Machine Learning', category: 'technical', color: '#7c3aed', description: 'Machine learning algorithms and techniques' },
  'deep-learning': { id: 'deep-learning', name: 'Deep Learning', category: 'technical', color: '#dc2626', description: 'Neural networks and deep learning architectures' },
  'reinforcement-learning': { id: 'reinforcement-learning', name: 'Reinforcement Learning', category: 'technical', color: '#059669', description: 'Reinforcement learning and alignment techniques' },
  'speech': { id: 'speech', name: 'Speech', category: 'technical', color: '#0d9488', description: 'Speech recognition, synthesis and spoken language models' },
  'nlp': { id: 'nlp', name: 'NLP', category: 'technical', color: '#2563eb', description: 'Natural language processing and text models' },
  'system-design': { id: 'system-design', name: 'System Design', category: 'technical', color: '#0891b2', description: 'ML system architecture and design' },
  'autonomous-driving': { id: 'autonomous-driving', name: 'Autonomous Driving', category: 'technical', color: '#16a34a', description: 'Self-driving cars and autonomous vehicle technology' },
  'python': { id: 'python', name: 'Python', category: 'technical', color: '#d97706', description: 'Python programming, libraries, and tools' },
  'technology': { id: 'technology', name: 'Technology', category: 'technical', color: '#475569', description: 'Technology trends and practical setups' },
  'personal': { id: 'personal', name: 'Personal', category: 'personal', color: '#db2777', description: 'Personal thoughts and experiences' },
  'family': { id: 'family', name: 'Family', category: 'family', color: '#ea580c', description: 'Family life and experiences' },
};

function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  return Math.ceil(countWords(text) / wordsPerMinute);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

function hasFormulas(html: string): boolean {
  return html.includes('class="katex');
}

function postDir(slug: string): string {
  return path.join(POST_CONTENT_DIR, slug);
}

function readMeta(slug: string): PostMeta {
  const file = path.join(postDir(slug), 'post.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as PostMeta;
  } catch (error) {
    throw new Error(`invalid ${path.relative(process.cwd(), file)}: ${(error as Error).message}`);
  }
}

function resolveTags(tagIds: string[]): Tag[] {
  return tagIds.map(tagId =>
    DEFAULT_TAGS[tagId] || {
      id: tagId,
      name: tagId.charAt(0).toUpperCase() + tagId.slice(1),
      category: 'technical' as const,
      color: '#6b7280',
      description: `Posts tagged with ${tagId}`
    }
  );
}

// A post is a folder content/posts/<slug>/ with post.json and NN-name.html section fragments.
function listSlugs(): string[] {
  if (!fs.existsSync(POST_CONTENT_DIR)) {
    return [];
  }
  return fs.readdirSync(POST_CONTENT_DIR).filter(name =>
    fs.existsSync(path.join(POST_CONTENT_DIR, name, 'post.json'))
  );
}

// Drafts (published: false) are listed only in `npm run dev`; production builds hide them.
const SHOW_DRAFTS_BY_DEFAULT = process.env.NODE_ENV === 'development';

export function getAllPosts(includeUnpublished: boolean = SHOW_DRAFTS_BY_DEFAULT): Post[] {
  const posts = listSlugs().map(slug => {
    const { html: _html, headings: _headings, ...post } = loadPost(slug);
    return post;
  });

  // Filter out unpublished posts unless explicitly requested
  const filteredPosts = includeUnpublished
    ? posts
    : posts.filter(post => post.published);

  // Sort by published date, newest first
  return filteredPosts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export function getPostBySlug(slug: string): PostWithContent | null {
  if (!listSlugs().includes(slug)) {
    return null;
  }
  return loadPost(slug);
}

function loadPost(slug: string): PostWithContent {
  const meta = readMeta(slug);
  const { html, headings, text } = renderSections(listSections(postDir(slug)));
  const publishedAt = new Date(meta.publishedAt);

  return {
    id: slug,
    slug,
    title: meta.title,
    excerpt: meta.excerpt,
    publishedAt,
    updatedAt: meta.updatedAt ? new Date(meta.updatedAt) : publishedAt,
    tags: resolveTags(meta.tags || []),
    author: {
      name: meta.author || 'Anand Mohan',
    },
    metadata: {
      readingTime: calculateReadingTime(text),
      wordCount: countWords(text),
      hasFormulas: hasFormulas(html),
    },
    published: meta.published !== false, // Default to true if not specified
    html,
    headings,
  };
}

export function getPostsByTag(tagId: string): Post[] {
  const allPosts = getAllPosts();
  return allPosts.filter(post => 
    post.tags.some(tag => tag.id === tagId)
  );
}

export function getAllTags(): Tag[] {
  const allPosts = getAllPosts();
  const tagMap = new Map<string, Tag>();

  allPosts.forEach(post => {
    post.tags.forEach(tag => {
      if (!tagMap.has(tag.id)) {
        tagMap.set(tag.id, tag);
      }
    });
  });

  return Array.from(tagMap.values());
}
export function getPostsByTags(tagIds: string[]): Post[] {
  if (tagIds.length === 0) {
    return getAllPosts();
  }
  
  const allPosts = getAllPosts();
  return allPosts.filter(post =>
    tagIds.every(tagId =>
      post.tags.some(tag => tag.id === tagId)
    )
  );
}

export function getPostsByCategory(category: Tag['category']): Post[] {
  const allPosts = getAllPosts();
  return allPosts.filter(post =>
    post.tags.some(tag => tag.category === category)
  );
}

export function getTagsByCategory(): Record<Tag['category'], Tag[]> {
  const allTags = getAllTags();
  return allTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<Tag['category'], Tag[]>);
}

export function getTagCounts(): Record<string, number> {
  const allPosts = getAllPosts();
  const counts: Record<string, number> = {};

  allPosts.forEach(post => {
    post.tags.forEach(tag => {
      counts[tag.id] = (counts[tag.id] || 0) + 1;
    });
  });

  return counts;
}