// Renders the installable-app PNGs from each tile SVG, so they are never hand-maintained.
//
// Sources: public/apps/icons/<id>.svg. Each tile is a rounded square with the glyph inside the
// maskable safe zone (the central 80% circle).
//
// Outputs next to each source (gitignored):
//   <id>-180.png           apple-touch-icon, flattened: iOS shows transparent corners as black
//   <id>-192.png           manifest "any", rounded corners kept
//   <id>-512.png           manifest "any", rounded corners kept
//   <id>-maskable-512.png  manifest "maskable", full bleed: the launcher applies its own mask

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const ICONS_DIR = 'public/apps/icons'

/** The tile's background: the fill of its first rect. */
function tileColour(svg, file) {
  const match = svg.match(/<rect\b[^>]*\bfill="(#[0-9a-fA-F]{6})"/)
  if (!match) throw new Error(`${file}: the first <rect> needs a hex fill (the tile colour)`)
  return match[1]
}

async function render(id) {
  const file = join(ICONS_DIR, `${id}.svg`)
  const svg = await readFile(file)
  const background = tileColour(svg.toString(), file)
  const at = (size) => sharp(svg, { density: (72 * size) / 512 }).resize(size, size)

  await at(180).flatten({ background }).png().toFile(join(ICONS_DIR, `${id}-180.png`))
  await at(192).png().toFile(join(ICONS_DIR, `${id}-192.png`))
  await at(512).png().toFile(join(ICONS_DIR, `${id}-512.png`))
  await at(512).flatten({ background }).png().toFile(join(ICONS_DIR, `${id}-maskable-512.png`))
}

const ids = (await readdir(ICONS_DIR)).filter((name) => name.endsWith('.svg')).map((name) => name.slice(0, -'.svg'.length))
await Promise.all(ids.map(render))
console.log(`build-app-icons: ${ids.length} tiles rendered`)
