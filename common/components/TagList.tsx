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
            <h3 className="text-sm font-semibold mb-2 text-muted">
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
                    className={`
                      inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full
                      transition-all duration-200 hover:scale-105
                      ${isSelected 
                        ? 'text-white shadow-md' 
                        : 'hover:shadow-sm'
                      }
                    `}
                    style={{
                      backgroundColor: isSelected ? tag.color : `${tag.color}20`,
                      color: isSelected ? 'white' : tag.color,
                      border: `1px solid ${tag.color}40`
                    }}
                    title={tag.description}
                  >
                    <span>{tag.name}</span>
                    {showCounts && count > 0 && (
                      <span className={`
                        text-xs px-1.5 py-0.5 rounded-full
                        ${isSelected ? 'bg-white/20' : 'bg-current/10'}
                      `}>
                        {count}
                      </span>
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

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map(tag => (
        <span
          key={tag.id}
          className={`
            font-medium rounded-full
            ${sizeClasses[size]}
          `}
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
            border: `1px solid ${tag.color}40`
          }}
          title={tag.description}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}