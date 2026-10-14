'use client'

// The family app's routes on the site. The PWA (personal-manager/web) used react-router with ids
// in the path (/shop/p/:id). The site is a static export, so every family page is a real Next
// route under /apps/family and ids travel in the query instead:
//
//   PWA path                          site URL
//   /                                 /apps/family
//   /feed/:id                         /apps/family/updates/item?id=
//   /shop/p/:id                       /apps/family/shop/p?id=
//   /shop/looks/:bottomId/:topId      /apps/family/shop/look?bottomId=&topId=
//   /health/:person/reports/:id       /apps/family/health/report?person=&id=
//   /nila/:tab/:id                    /apps/family/nila/:tab?id=
//   anything else, e.g. /fitness/plan /apps/family/fitness/plan
//
// No hosting rewrite is needed: each page is its own .html file, and fixed tab segments
// (fitness/:tab, nila/:tab) are listed in generateStaticParams. The family code keeps writing
// PWA paths; this module is the react-router subset it uses (Link, Navigate, useLocation,
// useNavigate, useParams, useSearchParams), translating both ways.

import { useEffect, useMemo, useState, type ComponentProps } from 'react'
import NextLink from 'next/link'
import { usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation'

export const FAMILY_BASE = '/apps/family'

interface IdRoute {
  /** PWA path with :name segments. */
  pwa: string
  /** Site page under FAMILY_BASE; :name segments stay in the path, the other names go to the query. */
  site: string
}

const ID_ROUTES: IdRoute[] = [
  { pwa: '/feed/:id', site: '/updates/item' },
  { pwa: '/shop/p/:id', site: '/shop/p' },
  { pwa: '/shop/looks/:bottomId/:topId', site: '/shop/look' },
  { pwa: '/health/:person/reports/:id', site: '/health/report' },
  { pwa: '/nila/:tab/:id', site: '/nila/:tab' },
]

/** Every PWA pattern with params, for useParams. */
const PARAM_ROUTES = [...ID_ROUTES.map((r) => r.pwa), '/fitness/:tab', '/nila/:tab']

type Params = Record<string, string | undefined>

function names(pattern: string): string[] {
  return pattern
    .split('/')
    .filter((s) => s.startsWith(':'))
    .map((s) => s.slice(1))
}

function match(pattern: string, path: string): Params | null {
  const want = pattern.split('/')
  const got = path.split('/')
  if (want.length !== got.length) return null
  const params: Params = {}
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(':')) {
      if (!got[i]) return null
      params[want[i].slice(1)] = decodeURIComponent(got[i])
    } else if (want[i] !== got[i]) {
      return null
    }
  }
  return params
}

function fill(pattern: string, params: Params): string {
  return pattern
    .split('/')
    .map((s) => (s.startsWith(':') ? encodeURIComponent(params[s.slice(1)] ?? '') : s))
    .join('/')
}

function splitUrl(url: string): { path: string; query: string; hash: string } {
  const hashAt = url.indexOf('#')
  const hash = hashAt >= 0 ? url.slice(hashAt) : ''
  const rest = hashAt >= 0 ? url.slice(0, hashAt) : url
  const queryAt = rest.indexOf('?')
  return {
    path: queryAt >= 0 ? rest.slice(0, queryAt) : rest,
    query: queryAt >= 0 ? rest.slice(queryAt + 1) : '',
    hash,
  }
}

/** Site URL for a PWA path, query and hash included. External URLs pass through. */
export function familyHref(to: string): string {
  if (!to.startsWith('/')) return to
  const { path, query, hash } = splitUrl(to)
  const search = new URLSearchParams(query)
  let site = path
  for (const route of ID_ROUTES) {
    const params = match(route.pwa, path)
    if (!params) continue
    const inPath = names(route.site)
    for (const name of names(route.pwa)) {
      if (!inPath.includes(name)) search.set(name, params[name] ?? '')
    }
    site = fill(route.site, params)
    break
  }
  const qs = search.toString()
  return `${FAMILY_BASE}${site === '/' ? '' : site}${qs ? `?${qs}` : ''}${hash}`
}

/** The PWA path and query for a site URL under FAMILY_BASE. */
function pwaLocation(pathname: string, search: URLSearchParams): { pathname: string; search: string } {
  const trimmed = pathname.replace(/\/+$/, '')
  const site = trimmed.startsWith(FAMILY_BASE) ? trimmed.slice(FAMILY_BASE.length) || '/' : trimmed || '/'
  const rest = new URLSearchParams(search)
  let path = site
  for (const route of ID_ROUTES) {
    const params = match(route.site, site)
    if (!params) continue
    const queryNames = names(route.pwa).filter((n) => !(n in params))
    if (!queryNames.every((n) => rest.get(n))) continue
    for (const n of queryNames) {
      params[n] = rest.get(n) ?? ''
      rest.delete(n)
    }
    path = fill(route.pwa, params)
    break
  }
  const qs = rest.toString()
  return { pathname: path, search: qs ? `?${qs}` : '' }
}

// Next has no hook for the hash: read it on every route change and on hashchange.
function useHash(): string {
  const pathname = usePathname()
  const search = useNextSearchParams().toString()
  const [hash, setHash] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash))
  useEffect(() => {
    const read = () => setHash(window.location.hash)
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [pathname, search])
  return hash
}

export function useLocation(): { pathname: string; search: string; hash: string } {
  const pathname = usePathname()
  const params = useNextSearchParams()
  const hash = useHash()
  const location = useMemo(() => pwaLocation(pathname, new URLSearchParams(params.toString())), [pathname, params])
  return { ...location, hash }
}

export function useParams(): Params {
  const { pathname } = useLocation()
  for (const pattern of PARAM_ROUTES) {
    const params = match(pattern, pathname)
    if (params) return params
  }
  return {}
}

interface NavigateOptions {
  replace?: boolean
}

export function useNavigate(): (to: string | number, options?: NavigateOptions) => void {
  const router = useRouter()
  return (to, options) => {
    if (typeof to === 'number') {
      router.back()
      return
    }
    const href = familyHref(to)
    if (options?.replace) router.replace(href)
    else router.push(href)
  }
}

type SearchInit = URLSearchParams | Record<string, string>

/** Query changes keep the scroll position, as react-router's setSearchParams did. */
export function useSearchParams(): [URLSearchParams, (next: SearchInit, options?: NavigateOptions) => void] {
  const router = useRouter()
  const { pathname, search } = useLocation()
  const params = useMemo(() => new URLSearchParams(search), [search])
  const setParams = (next: SearchInit, options?: NavigateOptions) => {
    const qs = new URLSearchParams(next).toString()
    const href = familyHref(`${pathname}${qs ? `?${qs}` : ''}`)
    if (options?.replace) router.replace(href, { scroll: false })
    else router.push(href, { scroll: false })
  }
  return [params, setParams]
}

export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const router = useRouter()
  const href = familyHref(to)
  useEffect(() => {
    if (replace) router.replace(href)
    else router.push(href)
  }, [router, href, replace])
  return null
}

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { to: string }

export function Link({ to, ...props }: LinkProps) {
  return <NextLink href={familyHref(to)} {...props} />
}
