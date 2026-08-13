import katex from 'katex'

export function MathBlock({ latex }: { latex: string }) {
  const html = katex.renderToString(latex, { throwOnError: false, displayMode: true })
  return <div className="sd-katex-block" dangerouslySetInnerHTML={{ __html: html }} />
}

export function MathInline({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const html = katex.renderToString(part.slice(1, -1), { throwOnError: false, displayMode: false })
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
