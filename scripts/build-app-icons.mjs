// Renders the installable-app PNGs from each tile SVG, so they are never hand-maintained.
//
// Sources: public/apps/icons/<id>.svg, plus public/apps/<private app>/icons/<id>.svg for
// private apps whose folders are gitignored. Each tile is a rounded square with the glyph
// inside the maskable safe zone (the central 80% circle).
//
// Outputs next to each source (gitignored):
//   <id>-180.png           apple-touch-icon, flattened: iOS shows transparent corners as black
//   <id>-192.png           manifest "any", rounded corners kept
//   <id>-512.png           manifest "any", rounded corners kept
//   <id>-maskable-512.png  manifest "maskable", full bleed: the launcher applies its own mask

import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const APPS_DIR = 'public/apps'

async function tileSources() {
  const entries = await readdir(APPS_DIR, { withFileTypes: true })
  const privateDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'icons')
    .map((entry) => join(APPS_DIR, entry.name, 'icons'))
    .filter((dir) => existsSync(dir))
  const dirs = [join(APPS_DIR, 'icons'), ...privateDirs]
  const sources = []
  for (const dir of dirs) {
    for (const name of await readdir(dir)) {
      if (name.endsWith('.svg')) sources.push({ dir, id: name.slice(0, -'.svg'.length) })
    }
  }
  return sources
}

/** The tile's background: the fill of its first rect. */
function tileColour(svg, file) {
  const match = svg.match(/<rect\b[^>]*\bfill="(#[0-9a-fA-F]{6})"/)
  if (!match) throw new Error(`${file}: the first <rect> needs a hex fill (the tile colour)`)
  return match[1]
}

async function render({ dir, id }) {
  const file = join(dir, `${id}.svg`)
  const svg = await readFile(file)
  const background = tileColour(svg.toString(), file)
  const at = (size) => sharp(svg, { density: (72 * size) / 512 }).resize(size, size)

  await at(180).flatten({ background }).png().toFile(join(dir, `${id}-180.png`))
  await at(192).png().toFile(join(dir, `${id}-192.png`))
  await at(512).png().toFile(join(dir, `${id}-512.png`))
  await at(512).flatten({ background }).png().toFile(join(dir, `${id}-maskable-512.png`))
}

const sources = await tileSources()
await Promise.all(sources.map(render))
console.log(`build-app-icons: ${sources.length} tiles rendered`)
