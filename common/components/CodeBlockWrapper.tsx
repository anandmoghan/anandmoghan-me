'use client';

import { useEffect } from 'react';

export default function CodeBlockWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const addCopyButtons = () => {
      const codeBlocks = document.querySelectorAll('pre');
      
      codeBlocks.forEach((pre) => {
        if (pre.querySelector('.copy-button')) return;
        
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copy</span>
        `;
        
        button.addEventListener('click', async () => {
          const code = pre.querySelector('code');
          const text = code?.textContent || '';
          
          try {
            await navigator.clipboard.writeText(text);
            button.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied</span>
            `;
            
            setTimeout(() => {
              button.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy</span>
              `;
            }, 2000);
          } catch (err) {
            console.error('Failed to copy:', err);
          }
        });
        
        pre.style.position = 'relative';
        pre.appendChild(button);
      });
    };
    
    addCopyButtons();
  }, [children]);
  
  return <>{children}</>;
}
