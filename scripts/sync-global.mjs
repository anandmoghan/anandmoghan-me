// Copies the shared stylesheets from the global folder into public/global/styles/.
// The copies are committed because CI builds without the global folder.
// Override the source with GLOBAL_DIR (default: ../global next to this repo).
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const globalDir = path.resolve(process.env.GLOBAL_DIR ?? path.join(repoRoot, '..', 'global'));
const sourceDir = path.join(globalDir, 'styles');
const targetDir = path.join(repoRoot, 'public', 'global', 'styles');

if (!existsSync(sourceDir)) {
  console.error(`sync-global: source folder not found: ${sourceDir}`);
  console.error('Set GLOBAL_DIR to the global folder, e.g. GLOBAL_DIR=~/workspace/code/global npm run sync-global');
  process.exit(1);
}

const files = readdirSync(sourceDir).filter((name) => name.endsWith('.css'));
if (files.length === 0) {
  console.error(`sync-global: no .css files in ${sourceDir}`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
for (const name of files) {
  copyFileSync(path.join(sourceDir, name), path.join(targetDir, name));
  console.log(`synced ${name}`);
}
