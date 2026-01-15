'use client';

import { useEffect, useState, useRef } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
  children: TocItem[];
}

interface TableOfContentsProps {
  content: string;
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const tocRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Extract headings from content (only h2 and h3)
    const headingRegex = /^(#{2,3})\s+(.+)$/gm;
    const headings: { level: number; text: string; id: string }[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      let text = match[2].trim();
      
      // Strip LaTeX math expressions from TOC display
      text = text
        .replace(/\$\$(.+?)\$\$/g, '$1')  // Display math
        .replace(/\$(.+?)\$/g, '$1')      // Inline math
        .replace(/\\text\{([^}]+)\}/g, '$1')  // \text{} commands
        .replace(/\\[a-zA-Z]+/g, '')      // Other LaTeX commands
        .replace(/[{}]/g, '')             // Curly braces
        .replace(/\s+/g, ' ')             // Normalize whitespace
        .trim();
      
      const id = match[2].trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      headings.push({ level, text, id });
    }

    // Build hierarchical structure
    const buildHierarchy = (items: typeof headings): TocItem[] => {
      const result: TocItem[] = [];
      const stack: TocItem[] = [];

      items.forEach(item => {
        const tocItem: TocItem = {
          id: item.id,
          text: item.text,
          level: item.level,
          children: []
        };

        while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
          stack.pop();
        }

        if (stack.length === 0) {
          result.push(tocItem);
        } else {
          stack[stack.length - 1].children.push(tocItem);
        }

        stack.push(tocItem);
      });

      return result;
    };

    setToc(buildHierarchy(headings));
  }, [content]);

  useEffect(() => {
    // Intersection Observer for active section highlighting
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0
      }
    );

    // Observe all headings (only h2 and h3)
    const headings = document.querySelectorAll('h2[id], h3[id]');
    headings.forEach((heading) => observer.observe(heading));

    return () => {
      headings.forEach((heading) => observer.unobserve(heading));
    };
  }, [toc]);

  // Scroll active item into view
  useEffect(() => {
    if (activeId && navRef.current) {
      // Find the active button by searching for the one with activeId
      const activeButton = navRef.current.querySelector(`button[data-heading-id="${activeId}"]`) as HTMLButtonElement;
      
      if (activeButton) {
        const navContainer = navRef.current;
        const buttonRect = activeButton.getBoundingClientRect();
        const containerRect = navContainer.getBoundingClientRect();
        
        // Check if button is outside visible area
        const isAbove = buttonRect.top < containerRect.top;
        const isBelow = buttonRect.bottom > containerRect.bottom;
        
        if (isAbove || isBelow) {
          // Calculate position relative to scroll container
          const relativeTop = buttonRect.top - containerRect.top + navContainer.scrollTop;
          const scrollTo = relativeTop - navContainer.clientHeight / 2 + buttonRect.height / 2;
          
          navContainer.scrollTo({
            top: Math.max(0, scrollTo),
            behavior: 'smooth'
          });
        }
      }
    }
  }, [activeId]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      // Close mobile menu after clicking
      setIsOpen(false);
    }
  };

  const renderTocItems = (items: TocItem[], parentLevel = 1, parentH2Id: string | null = null) => {
    // Check if any H2 item or its children are active
    const getActiveH2Id = () => {
      for (const item of items) {
        if (item.id === activeId) return item.id;
        const checkChildren = (children: TocItem[]): string | null => {
          for (const child of children) {
            if (child.id === activeId) return item.id; // Return parent H2 id
            const found = checkChildren(child.children);
            if (found) return found;
          }
          return null;
        };
        const found = checkChildren(item.children);
        if (found) return found;
      }
      return null;
    };
    
    const activeH2Id = getActiveH2Id();
    
    // Check if current item or any of its children are active
    const isInActiveChain = (item: TocItem): boolean => {
      if (item.id === activeId) return true;
      return item.children.some(child => isInActiveChain(child));
    };
    
    return (
      <ul className="space-y-1 relative">
        {/* Main vertical line for H2 headings - always light */}
        {parentLevel === 1 && items.length > 0 && (
          <div
            className="absolute left-0 top-2 bottom-2 w-px"
            style={{
              backgroundColor: 'var(--border)',
              left: '4px',
              opacity: 0.3
            }}
          />
        )}
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasChildren = item.children.length > 0;
          
          // Calculate font size based on level
          const getFontSize = (level: number) => {
            switch(level) {
              case 2: return '0.875rem'; // 14px - H2
              case 3: return '0.8125rem'; // 13px - H3
              case 4: return '0.75rem'; // 12px - H4
              default: return '0.6875rem'; // 11px - H5+
            }
          };
          
          return (
            <li key={item.id} className="relative">
              {/* Highlighted vertical line for active H2 section and its children */}
              {item.level === 2 && isInActiveChain(item) && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-px transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--accent)',
                    left: '4px'
                  }}
                />
              )}
              
              {/* Vertical line for parent connection (H3+) - highlight if in active chain */}
              {item.level > 2 && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-px transition-colors duration-200"
                  style={{
                    backgroundColor: isInActiveChain(item) ? 'var(--accent)' : 'var(--border)',
                    left: `${(item.level - 3) * 0.75 + 1}rem`,
                    height: isLast && !hasChildren ? '0.75rem' : '100%'
                  }}
                />
              )}
              
              {/* Horizontal connector line for H2 */}
              {item.level === 2 && (
                <div
                  className="absolute h-px transition-colors duration-200"
                  style={{
                    backgroundColor: isInActiveChain(item) ? 'var(--accent)' : 'var(--border)',
                    left: '4px',
                    top: '0.75rem',
                    width: '8px'
                  }}
                />
              )}
              
              {/* Horizontal connector line for H3+ */}
              {item.level > 2 && (
                <div
                  className="absolute h-px transition-colors duration-200"
                  style={{
                    backgroundColor: isInActiveChain(item) ? 'var(--accent)' : 'var(--border)',
                    left: `${(item.level - 3) * 0.75 + 1}rem`,
                    top: '0.75rem',
                    width: '8px'
                  }}
                />
              )}
              
              <button
                data-heading-id={item.id}
                onClick={() => scrollToHeading(item.id)}
                className={`text-left w-full transition-all duration-200 hover:opacity-70 relative flex items-start ${
                  activeId === item.id
                    ? 'font-semibold'
                    : 'font-normal'
                }`}
                style={{
                  color: activeId === item.id ? 'var(--accent)' : 'var(--muted)',
                  paddingLeft: item.level === 2 ? '0.75rem' : `${(item.level - 2) * 0.75 + 1.25}rem`,
                  fontSize: getFontSize(item.level),
                  paddingTop: '0.375rem',
                  paddingBottom: '0.375rem',
                  marginLeft: item.level === 2 ? '4px' : `${(item.level - 3) * 0.75 + 1}rem`,
                  lineHeight: '1.4'
                }}
              >
                {/* Bullet point for all items */}
                <span
                  className="flex-shrink-0"
                  style={{
                    width: item.level === 2 ? '5px' : '4px',
                    height: item.level === 2 ? '5px' : '4px',
                    borderRadius: '50%',
                    backgroundColor: activeId === item.id ? 'var(--accent)' : 'var(--border)',
                    marginRight: '0.5rem',
                    marginTop: '0.4rem'
                  }}
                />
                <span style={{ 
                  flex: 1, 
                  wordBreak: 'break-word', 
                  overflowWrap: 'break-word',
                  hyphens: 'auto',
                  maxWidth: '100%'
                }}>{item.text}</span>
              </button>
              
              {hasChildren && (
                <div className="relative">
                  {renderTocItems(item.children, item.level, item.level === 2 ? item.id : parentH2Id)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  if (toc.length === 0) return null;

  return (
    <>
      {/* Desktop TOC - Sticky sidebar */}
      <aside className="hidden lg:block w-72 flex-shrink-0 self-stretch">
        <div className="sticky top-32 z-10">
          <div className="rounded-lg border shadow-sm" style={{
            backgroundColor: 'white',
            borderColor: 'var(--border)',
            maxHeight: 'calc(100vh - 10rem)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Sticky header */}
            <div className="p-5 pb-3 border-b flex-shrink-0" style={{
              backgroundColor: 'white',
              borderColor: 'var(--border)',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px'
            }}>
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ 
                color: 'var(--foreground)'
              }}>
                On This Page
              </h2>
            </div>
            
            {/* Scrollable content */}
            <nav 
              ref={navRef}
              className="pl-5 pr-6 pt-3 pb-5 overflow-y-auto overflow-x-hidden flex-1" 
              style={{
                minHeight: 0,
                borderBottomLeftRadius: '8px',
                borderBottomRightRadius: '8px'
              }}
            >
              {renderTocItems(toc)}
            </nav>
          </div>
        </div>
      </aside>

      {/* Mobile TOC - Floating button and drawer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* Floating toggle button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-transform hover:scale-110"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'white'
          }}
          aria-label="Toggle table of contents"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Drawer */}
        <div
          ref={tocRef}
          className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{
            backgroundColor: 'white',
            maxHeight: '70vh',
            overflow: 'hidden'
          }}
        >
          <div className="p-4 border-b" style={{ 
            borderColor: 'var(--border)',
            backgroundColor: 'white'
          }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                On This Page
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:opacity-70 transition-opacity"
                style={{ color: 'var(--muted)' }}
                aria-label="Close table of contents"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
          <nav className="pl-4 pr-8 py-3 overflow-y-auto" style={{ 
            maxHeight: 'calc(70vh - 4rem)', 
            overflowX: 'hidden' 
          }}>
            {renderTocItems(toc)}
          </nav>
        </div>
      </div>
    </>
  );
}
