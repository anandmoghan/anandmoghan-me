import { execSync, spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const ROOT = path.resolve(import.meta.dirname, '..')
const PORT = 4319
const BASE_URL = `http://localhost:${PORT}`
const NICKNAME = 'PDF Export'
const SLUGS = ['fin-project-review']

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`))
            return
          }
          setTimeout(attempt, 300)
        })
    }
    attempt()
  })
}

async function generateDeckPdf(browser, slug, outputPath) {
  const page = await browser.newPage()
  await page.goto(`${BASE_URL}/share/${slug}`, { waitUntil: 'networkidle0' })

  await page.waitForSelector('input[placeholder="Nickname"]')
  await page.type('input[placeholder="Nickname"]', NICKNAME)
  await page.click('button[type="submit"]')

  await page.waitForSelector('.sd-print-only')

  await page.emulateMediaType('print')
  await page.pdf({ path: outputPath, preferCSSPageSize: true, printBackground: true })

  await page.close()
  console.log(`Wrote ${outputPath}`)
}

async function main() {
  execSync('npx vite build', { cwd: ROOT, stdio: 'inherit' })

  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'inherit',
  })

  try {
    await waitForServer(BASE_URL)

    const outDir = path.join(ROOT, 'public', 'decks')
    mkdirSync(outDir, { recursive: true })

    const browser = await puppeteer.launch()
    try {
      for (const slug of SLUGS) {
        await generateDeckPdf(browser, slug, path.join(outDir, `${slug}.pdf`))
      }
    } finally {
      await browser.close()
    }
  } finally {
    server.kill()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
