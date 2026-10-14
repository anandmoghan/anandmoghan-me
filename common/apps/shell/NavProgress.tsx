'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Starts on the tap of any internal link (or a custom `nav-start` event) and
// completes when the new route has rendered.
function NavProgressBar() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const key = search ? `${pathname}?${search}` : pathname
  const [running, setRunning] = useState(false)
  const keyRef = useRef(key)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const target = e.target instanceof Element ? e.target : null
      const a = target?.closest('a[href]')
      if (!(a instanceof HTMLAnchorElement) || a.target === '_blank') return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname + url.search === keyRef.current) return
      setRunning(true)
    }
    const start = () => setRunning(true)
    document.addEventListener('click', onClick, true)
    window.addEventListener('nav-start', start)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('nav-start', start)
    }
  }, [])

  useEffect(() => {
    keyRef.current = key
    const t = setTimeout(() => setRunning(false), 200)
    return () => clearTimeout(t)
  }, [key])

  // Never hang if a click did not lead to a route change.
  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => setRunning(false), 8000)
    return () => clearTimeout(t)
  }, [running])

  return <div className={running ? 'nav-progress__bar is-running' : 'nav-progress__bar'} />
}

// Thin top bar in the area colour (global app.css .nav-progress). useSearchParams
// needs a Suspense boundary in a static export, so the bar brings its own.
export function NavProgress() {
  return (
    <div aria-hidden className="nav-progress">
      <Suspense fallback={null}>
        <NavProgressBar />
      </Suspense>
    </div>
  )
}
