import type { MDXComponents } from "mdx/types";
import ResponsiveImage from "./common/components/ResponsiveImage";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    img: (props: any) => (
      <figure style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '2rem 0' }}>
        <ResponsiveImage
          src={props.src}
          alt={props.alt || ''}
          width={800}
          height={600}
          className="max-w-full h-auto"
        />
        {props.alt && (
          <figcaption style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            {props.alt}
          </figcaption>
        )}
      </figure>
    ),
  };
}

