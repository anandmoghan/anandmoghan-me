import type { Tag } from '../types/post';

interface TagListProps {
  tags: Tag[];
  selectedTags?: string[];
  onTagClick?: (tagId: string) => void;
  showCounts?: boolean;
  tagCounts?: Record<string, number>;
  className?: string;
}

export default function TagList({ 
  tags, 
  selectedTags = [], 
  onTagClick, 
  showCounts = false, 
  tagCounts = {},
  className = '' 
}: TagListProps) {
  if (tags.length === 0) {
    return null;
  }

  // Group tags by category
  const tagsByCategory = tags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const categoryOrder: Array<Tag['category']> = ['official', 'technical', 'personal', 'family'];
  const categoryLabels = {
    official: 'Official',
    technical: 'Technical',
    personal: 'Personal',
    family: 'Family'
  };

  return (
    <div className={`tag-list ${className}`}>
      {categoryOrder.map(category => {
        const categoryTags = tagsByCategory[category];
        if (!categoryTags || categoryTags.length === 0) return null;

        return (
          <div key={category} className="mb-4">
            <h3 className="text-sm font-bold mb-2 text-muted">
              {categoryLabels[category]}
            </h3>
            <div className="flex flex-wrap gap-2">
              {categoryTags.map(tag => {
                const isSelected = selectedTags.includes(tag.id);
                const count = tagCounts[tag.id] || 0;
                
                return (
                  <button
                    key={tag.id}
                    onClick={() => onTagClick?.(tag.id)}
                    className={`chip ${isSelected ? 'is-active' : ''}`}
                    aria-pressed={isSelected}
                    title={tag.description}
                  >
                    <span>{tag.name}</span>
                    {showCounts && count > 0 && (
                      <span className="chip__count">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Simplified version for inline tag display
interface InlineTagListProps {
  tags: Tag[];
  className?: string;
  size?: 'sm' | 'md';
}

export function InlineTagList({ tags, className = '', size = 'sm' }: InlineTagListProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map(tag => (
        <span
          key={tag.id}
          className={`badge badge--accent ${size === 'md' ? 'text-sm' : ''}`}
          title={tag.description}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}