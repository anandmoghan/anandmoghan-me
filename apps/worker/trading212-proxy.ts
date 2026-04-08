const T212_BASE = 'https://live.trading212.com/api/v0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-T212-Key',
}

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
    }

    const apiKey = request.headers.get('X-T212-Key')
    if (!apiKey) {
      return new Response('Missing X-T212-Key header', { status: 400, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    // Strip the worker's own path prefix - proxy passes through the path directly
    const t212Path = url.pathname + url.search
    const t212Url = `${T212_BASE}${t212Path}`

    try {
      const response = await fetch(t212Url, {
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
      })

      const body = await response.text()
      return new Response(body, {
        status: response.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      })
    } catch (err) {
      return new Response(`Proxy error: ${err}`, { status: 502, headers: CORS_HEADERS })
    }
  },
}
