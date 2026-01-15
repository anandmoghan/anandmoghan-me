import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

export default function rehypeHeadingIds() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName)) {
        // Extract text content from the heading
        const text = extractText(node);
        
        // Generate ID from text
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        // Add ID to the heading
        if (!node.properties) {
          node.properties = {};
        }
        node.properties.id = id;
      }
    });
  };
}

function extractText(node: any): string {
  if (node.type === 'text') {
    return node.value;
  }
  if (node.children) {
    return node.children.map(extractText).join('');
  }
  return '';
}
