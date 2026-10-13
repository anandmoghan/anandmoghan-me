'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Tag, Post } from '../types/post';

interface TagFilterProps {
  posts: Post[];
  onFilteredPostsChange: (posts: Post[]) => void;
  className?: string;
}

export default function TagFilter({ posts, onFilteredPostsChange, className = '' }: TagFilterProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Filter posts based on selected tags
  const filteredPosts = useMemo(() => {
    if (selectedTags.length === 0) {
      return posts;
    }

    return posts.filter(post =>
      selectedTags.every(tagId =>
        post.tags.some(tag => tag.id === tagId)
      )
    );
  }, [posts, selectedTags]);

  // Get available tags and their counts based on current filter
  const { availableTags, availableTagCounts } = useMemo(() => {
    const tagMap = new Map<string, Tag>();
    const counts: Record<string, number> = {};

    // For each tag, calculate how many posts would remain if we added this tag to the filter
    posts.forEach(post => {
      post.tags.forEach(tag => {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      });
    });

    // Calculate counts for each tag based on what would be available
    Array.from(tagMap.values()).forEach(tag => {
      if (selectedTags.includes(tag.id)) {
        // If tag is already selected, count current filtered posts
        counts[tag.id] = filteredPosts.filter(post => 
          post.tags.some(postTag => postTag.id === tag.id)
        ).length;
      } else {
        // If tag is not selected, count posts that would remain if we added this tag
        const wouldRemain = posts.filter(post =>
          // Post must have all currently selected tags AND this new tag
          selectedTags.every(selectedTagId =>
            post.tags.some(postTag => postTag.id === selectedTagId)
          ) && post.tags.some(postTag => postTag.id === tag.id)
        ).length;
        counts[tag.id] = wouldRemain;
      }
    });

    // Only include tags that have posts available (count > 0)
    const availableTagsArray = Array.from(tagMap.values()).filter(tag => counts[tag.id] > 0);

    // Sort tags: selected tags first, then by count (most used first), then by name
    const sortedTags = availableTagsArray.sort((a, b) => {
      const aSelected = selectedTags.includes(a.id);
      const bSelected = selectedTags.includes(b.id);
      
      // Selected tags come first
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      
      // Then sort by count (descending) and name (ascending)
      const countDiff = counts[b.id] - counts[a.id];
      return countDiff !== 0 ? countDiff : a.name.localeCompare(b.name);
    });

    return {
      availableTags: sortedTags,
      availableTagCounts: counts
    };
  }, [posts, selectedTags, filteredPosts]);

  // Update parent component when filtered posts change
  useEffect(() => {
    onFilteredPostsChange(filteredPosts);
  }, [filteredPosts, onFilteredPostsChange]);

  const handleTagClick = (tagId: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tagId)) {
        // Remove tag if already selected
        return prev.filter(id => id !== tagId);
      } else {
        // Add tag if not selected
        return [...prev, tagId];
      }
    });
  };

  const clearAllTags = () => {
    setSelectedTags([]);
  };

  const hasSelectedTags = selectedTags.length > 0;

  if (availableTags.length === 0) {
    return null;
  }

  return (
    <div className={`tag-filter ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-muted">
          Filter by tags
        </h3>
        {hasSelectedTags && (
          <button
            onClick={clearAllTags}
            className="btn btn--ghost btn--sm"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Horizontal tag list */}
      <div className="flex flex-wrap gap-2 mb-4">
        {availableTags.map(tag => {
          const isSelected = selectedTags.includes(tag.id);
          const count = availableTagCounts[tag.id] || 0;

          return (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.id)}
              className={`chip ${isSelected ? 'is-active' : ''}`}
              aria-pressed={isSelected}
              title={tag.description}
            >
              <span>{tag.name}</span>
              <span className="chip__count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Results summary */}
      {hasSelectedTags && (
        <div className="text-xs text-muted">
          Showing {filteredPosts.length} of {posts.length} posts
        </div>
      )}
    </div>
  );
}