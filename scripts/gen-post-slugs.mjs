// Writes functions/src/postSlugs.json: the slugs POST /api/views/:slug may count, i.e. every
// content/posts/<slug>/ whose post.json is not `"published": false`. Run by the functions build
// (`npm --prefix functions run build`), so each functions deploy picks up the current posts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = path.join(ROOT, 'content/posts');
const OUT = path.join(ROOT, 'functions/src/postSlugs.json');

const slugs = fs
  .readdirSync(POSTS)
  .filter((slug) => fs.existsSync(path.join(POSTS, slug, 'post.json')))
  .filter((slug) => JSON.parse(fs.readFileSync(path.join(POSTS, slug, 'post.json'), 'utf8')).published !== false)
  .sort();

fs.writeFileSync(OUT, `${JSON.stringify(slugs, null, 2)}\n`);
console.log(`postSlugs.json: ${slugs.length} published posts`);
