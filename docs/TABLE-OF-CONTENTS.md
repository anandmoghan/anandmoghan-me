# Table of Contents Feature

## Overview

The Table of Contents (TOC) feature automatically generates a hierarchical navigation menu from all headings (H2-H6) in your blog posts. It provides an enhanced reading experience with tree-like visual structure, active section highlighting, and smooth scrolling.

## Features

### Desktop Experience
- **Sticky Sidebar**: TOC starts aligned with the content and becomes sticky when scrolling
- **Tree Structure**: Visual lines and bullets connect nested headings
- **Scrollable**: Independent scrollbar if TOC content exceeds viewport height
- **Active Section Highlighting**: Current section is highlighted with accent color and left border
- **Smooth Scrolling**: Clicking any heading smoothly scrolls to that section
- **Math-Aware**: LaTeX expressions in headings are stripped for clean TOC display

### Mobile Experience
- **Floating Button**: A circular button appears in the bottom-right corner
- **Slide-up Drawer**: Tapping the button reveals a drawer from the bottom
- **Backdrop**: Semi-transparent overlay when drawer is open
- **Auto-close**: Drawer closes automatically after selecting a heading

## Implementation Details

### Components

#### `TableOfContents.tsx`
Main component that:
1. Parses MDX content to extract headings (H2-H6)
2. Builds hierarchical structure based on heading levels
3. Uses Intersection Observer to track active section
4. Renders responsive UI (desktop sidebar + mobile drawer)

#### `rehype-heading-ids.ts`
Rehype plugin that:
1. Automatically adds IDs to all headings during MDX compilation
2. Generates IDs from heading text (lowercase, hyphenated)
3. Ensures headings are linkable and trackable

### How It Works

1. **Content Parsing**: The component receives raw MDX content and extracts all headings using regex
2. **Math Stripping**: LaTeX expressions ($...$, $$...$$, \text{}, etc.) are removed from TOC display text
3. **ID Generation**: Heading text is converted to URL-friendly IDs (e.g., "Attention Mechanisms" → "attention-mechanisms")
4. **Hierarchy Building**: Headings are organized into a tree structure based on their levels
5. **Active Tracking**: Intersection Observer monitors which heading is currently in the viewport
6. **Smooth Navigation**: Clicking a TOC item scrolls to the heading with proper offset for fixed headers
7. **Sticky Positioning**: TOC starts at content level and sticks to viewport when scrolling

### Styling

- Uses CSS custom properties for theming (`--accent`, `--muted`, `--border`, etc.)
- Responsive breakpoints: `lg:` prefix for desktop (≥1024px)
- Custom scrollbar styling for desktop TOC
- Smooth transitions for all interactive elements

## Usage

The TOC is automatically included in all blog post pages. No additional configuration needed.

### For New Posts

Simply write your MDX content with proper heading hierarchy:

```markdown
## Main Section

Content here...

### Subsection

More content...

#### Sub-subsection

Even more content...
```

The TOC will automatically:
- Extract all headings
- Generate proper IDs
- Create the navigation structure
- Track active sections

## Customization

### Adjusting TOC Position (Desktop)

In `common/components/TableOfContents.tsx`, modify the sticky positioning:

```tsx
<div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
```

- `top-24`: Distance from top when sticky (6rem = 96px)
- `max-h-[calc(100vh-7rem)]`: Maximum height accounting for top offset

### Adjusting Content Layout

In `app/(static-pages)/posts/[slug]/page.tsx`, the layout uses flexbox:

```tsx
<div className="flex gap-8 items-start">
  <div className="flex-1 min-w-0">
    {/* Main content */}
  </div>
  <TableOfContents content={post.content} />
</div>
```

- `gap-8`: Space between content and TOC
- `flex-1 min-w-0`: Content takes remaining space

### Changing Mobile Drawer Height

In `TableOfContents.tsx`, modify the drawer's `maxHeight`:

```tsx
style={{ maxHeight: '70vh' }}
```

### Customizing Active Section Detection

Adjust the Intersection Observer options:

```tsx
{
  rootMargin: '-80px 0px -80% 0px',  // Adjust these values
  threshold: 0
}
```

- First value: Top offset (accounts for fixed header)
- Third value: Bottom margin (determines when section becomes "active")

## Browser Compatibility

- Modern browsers with Intersection Observer support
- Fallback: TOC still works without active highlighting on older browsers
- Mobile drawer uses CSS transforms for smooth animations

## Performance

- Headings are parsed once on component mount
- Intersection Observer is efficient for scroll tracking
- No re-renders on scroll (only state updates for active section)
- Smooth scroll uses native browser API

## Accessibility

- Semantic HTML (`<nav>`, `<aside>`)
- Proper ARIA labels on buttons
- Keyboard navigable
- Screen reader friendly heading structure
