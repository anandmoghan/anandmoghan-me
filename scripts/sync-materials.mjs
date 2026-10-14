// Copies the materials content (pages and shared fragments) from the materials repo into
// content/materials/, rewriting paths for this site:
//   <!-- @include common/fragments/x.html -->  ->  <!-- @include content/materials/fragments/x.html -->
//   href="/<page>/..."                         ->  href="/apps/materials/<page>/..."
// The copies are committed. Override the source with MATERIALS_DIR (default: ../materials).
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const materialsDir = path.resolve(process.env.MATERIALS_DIR ?? path.join(repoRoot, '..', 'materials'));
const targetDir = path.join(repoRoot, 'content', 'materials');

const copies = [
  { from: path.join(materialsDir, 'pages'), to: path.join(targetDir, 'pages') },
  { from: path.join(materialsDir, 'common', 'fragments'), to: path.join(targetDir, 'fragments') },
];

for (const { from } of copies) {
  if (!existsSync(from)) {
    console.error(`sync-materials: source folder not found: ${from}`);
    console.error('Set MATERIALS_DIR to the materials repo, e.g. MATERIALS_DIR=~/workspace/code/materials npm run sync-materials');
    process.exit(1);
  }
}

function rewrite(html) {
  return html
    .replace(/(<!--\s*@include\s+)common\/fragments\//g, '$1content/materials/fragments/')
    .replace(/(\s(?:href|src)=")\/(?!\/|apps\/materials\/)/g, '$1/apps/materials/');
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    return statSync(file).isDirectory() ? listFiles(file) : [file];
  });
}

let fileCount = 0;
for (const { from, to } of copies) {
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true, filter: (src) => !/(^|\/)\.DS_Store$/.test(src) });
  for (const file of listFiles(to)) {
    fileCount += 1;
    if (!file.endsWith('.html')) continue;
    const source = readFileSync(file, 'utf8');
    const next = rewrite(source);
    if (next !== source) writeFileSync(file, next);
  }
  console.log(`synced ${path.relative(materialsDir, from)} -> ${path.relative(repoRoot, to)}`);
}
console.log(`sync-materials: ${fileCount} files`);
