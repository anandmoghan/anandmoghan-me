import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Post, PostFrontmatter, Tag } from '../types/post';

const POST_CONTENT_DIR = path.join(process.cwd(), 'content/posts');

// Default tag definitions
const DEFAULT_TAGS: Record<string, Tag> = {
  'ai': { id: 'ai', name: 'AI', category: 'technical', color: '#3b82f6' },
  'machine-learning': { id: 'machine-learning', name: 'Machine Learning', category: 'technical', color: '#8b5cf6' },
  'personal': { id: 'personal', name: 'Personal', category: 'personal', color: '#ec4899' },
  'family': { id: 'family', name: 'Family', category: 'family', color: '#f59e0b' },
  'official': { id: 'official', name: 'Official', category: 'official', color: '#10b981' },
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

export function getAllPosts(): Post[] {
  if (!fs.existsSync(POST_CONTENT_DIR)) {
    return [];
  }

  const files = fs.readdirSync(POST_CONTENT_DIR);
  const mdxFiles = files.filter(file => file.endsWith('.mdx') || file.endsWith('.md'));

  const posts = mdxFiles.map(filename => {
    const slug = filename.replace(/\.(mdx|md)$/, '');
    return getPostBySlug(slug);
  }).filter((post): post is Post => post !== null);

  // Sort by published date, newest first
  return posts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
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
        name: tagId, 
        category: 'technical' as const, 
        color: '#6b7280' 
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
