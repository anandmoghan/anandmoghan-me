import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Post, PostFrontmatter, Tag } from '../types/post';

const POST_CONTENT_DIR = path.join(process.cwd(), 'content/posts');

// Default tag definitions
const DEFAULT_TAGS: Record<string, Tag> = {
  'ai': { id: 'ai', name: 'AI', category: 'technical', color: '#3b82f6', description: 'Artificial Intelligence research and applications' },
  'machine-learning': { id: 'machine-learning', name: 'Machine Learning', category: 'technical', color: '#8b5cf6', description: 'Machine learning algorithms and techniques' },
  'reinforcement-learning': { id: 'reinforcement-learning', name: 'Reinforcement Learning', category: 'technical', color: '#a855f7', description: 'Reinforcement learning and alignment techniques' },
  'deep-learning': { id: 'deep-learning', name: 'Deep Learning', category: 'technical', color: '#7c3aed', description: 'Neural networks and deep learning' },
  'autonomous-driving': { id: 'autonomous-driving', name: 'Autonomous Driving', category: 'technical', color: '#0891b2', description: 'Self-driving cars and autonomous vehicle technology' },
  'research': { id: 'research', name: 'Research', category: 'technical', color: '#059669', description: 'Academic and industry research' },
  'personal': { id: 'personal', name: 'Personal', category: 'personal', color: '#ec4899', description: 'Personal thoughts and experiences' },
  'family': { id: 'family', name: 'Family', category: 'family', color: '#f59e0b', description: 'Family life and experiences' },
  'official': { id: 'official', name: 'Official', category: 'official', color: '#10b981', description: 'Official work and professional content' },
  'uk': { id: 'uk', name: 'UK Life', category: 'personal', color: '#dc2626', description: 'Life experiences in the United Kingdom' },
  'technology': { id: 'technology', name: 'Technology', category: 'technical', color: '#2563eb', description: 'Technology trends and insights' },
  'systems': { id: 'systems', name: 'Systems', category: 'technical', color: '#7c2d12', description: 'System design and architecture' },
};

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

function hasFormulas(content: string): boolean {
  // Check for LaTeX math delimiters
  return /\$\$[\s\S]*?\$\$|\$[^\$]+\$/.test(content);
}

export function getAllPosts(includeUnpublished: boolean = false): Post[] {
  if (!fs.existsSync(POST_CONTENT_DIR)) {
    return [];
  }

  const files = fs.readdirSync(POST_CONTENT_DIR);
  const mdxFiles = files.filter(file => file.endsWith('.mdx') || file.endsWith('.md'));

  const posts = mdxFiles.map(filename => {
    const slug = filename.replace(/\.(mdx|md)$/, '');
    return getPostBySlug(slug);
  }).filter((post): post is Post => post !== null);

  // Filter out unpublished posts unless explicitly requested
  const filteredPosts = includeUnpublished 
    ? posts 
    : posts.filter(post => post.published);

  // Sort by published date, newest first
  return filteredPosts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export function getPostBySlug(slug: string): Post | null {
  try {
    const fullPath = path.join(POST_CONTENT_DIR, `${slug}.mdx`);
    const altPath = path.join(POST_CONTENT_DIR, `${slug}.md`);
    
    let filePath = fullPath;
    if (!fs.existsSync(fullPath) && fs.existsSync(altPath)) {
      filePath = altPath;
    } else if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    const frontmatter = data as PostFrontmatter;

    const tags = (frontmatter.tags || []).map(tagId => 
      DEFAULT_TAGS[tagId] || { 
        id: tagId, 
        name: tagId.charAt(0).toUpperCase() + tagId.slice(1), 
        category: 'technical' as const, 
        color: '#6b7280',
        description: `Posts tagged with ${tagId}`
      }
    );

    const wordCount = content.trim().split(/\s+/).length;

    return {
      id: slug,
      slug,
      title: frontmatter.title,
      content,
      excerpt: frontmatter.excerpt,
      publishedAt: new Date(frontmatter.publishedAt),
      updatedAt: frontmatter.updatedAt ? new Date(frontmatter.updatedAt) : new Date(frontmatter.publishedAt),
      tags,
      author: {
        name: frontmatter.author || 'Anand Mohan',
      },
      metadata: {
        readingTime: calculateReadingTime(content),
        wordCount,
        hasFormulas: hasFormulas(content),
      },
      published: frontmatter.published !== false, // Default to true if not specified
    };
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
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