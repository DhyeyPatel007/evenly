// Injects PWA / Add-to-Home-Screen <head> tags into dist/index.html after export.
//
// Why this exists: Expo Router ignores app/+html.tsx when web.output is
// "single" (SPA, the default) — it only honours it for "static" output.
// So the tags are injected post-export instead. This runs both locally and
// on Vercel (see buildCommand in vercel.json).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'dist', 'index.html');
let html = readFileSync(file, 'utf8');

const tags = [
  '<link rel="manifest" href="/manifest.json" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '<meta name="apple-mobile-web-app-title" content="Evenly" />',
  '<meta name="theme-color" content="#ffffff" />',
  '<meta name="description" content="Split bills with friends — Evenly figures out who owes whom." />',
].join('\n    ');

html = html.replace(/<title>.*?<\/title>/, '<title>Evenly</title>');
if (!html.includes('apple-touch-icon')) {
  html = html.replace('</head>', `    ${tags}\n  </head>`);
}
writeFileSync(file, html);
console.log('injected PWA head tags into dist/index.html');
