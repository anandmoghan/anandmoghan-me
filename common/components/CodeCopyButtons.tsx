'use client';

import { useEffect } from 'react';

const COPY_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
  '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
  '<polyline points="20 6 9 17 4 12"/></svg>';

// Post bodies are static HTML, so copy buttons are added to their <pre> blocks after mount.
export default function CodeCopyButtons({ containerId }: { containerId: string }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const added: HTMLElement[] = [];
    container.querySelectorAll('pre').forEach((pre) => {
      if (pre.parentElement?.classList.contains('code-block-wrapper')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      pre.replaceWith(wrapper);
      wrapper.appendChild(pre);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-code-button';
      button.setAttribute('aria-label', 'Copy code');
      button.innerHTML = `${COPY_ICON}<span>Copy</span>`;
      button.addEventListener('click', async () => {
        await navigator.clipboard.writeText(pre.textContent ?? '');
        button.innerHTML = `${CHECK_ICON}<span>Copied</span>`;
        setTimeout(() => {
          button.innerHTML = `${COPY_ICON}<span>Copy</span>`;
        }, 2000);
      });
      wrapper.prepend(button);
      added.push(wrapper);
    });

    return () => {
      added.forEach((wrapper) => {
        const pre = wrapper.querySelector('pre');
        if (pre) wrapper.replaceWith(pre);
      });
    };
  }, [containerId]);

  return null;
}
