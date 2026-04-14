import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const NPM_PACKAGE = path.join(
  projectRoot,
  'node_modules/@project-sunbird/content-player'
);
const LOCAL_OVERRIDES = path.join(projectRoot, 'content-player');
const DEST = path.join(projectRoot, 'public', 'content-player');

// Files to skip from the npm package
const SKIP_FILES = new Set([
  'package.json',
  'README.md',
  'preview_cdn.html',
]);

function copyDirectory(src, dest, skip = new Set()) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory "${src}" does not exist.`);
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (skip.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('\n📦 Assembling content-player...\n');

try {
  // Clean destination
  if (fs.existsSync(DEST)) {
    fs.rmSync(DEST, { recursive: true, force: true });
  }
  fs.mkdirSync(DEST, { recursive: true });

  // Step 1: Copy npm package first (base layer)
  if (!fs.existsSync(NPM_PACKAGE)) {
    throw new Error(
      '@project-sunbird/content-player is not installed. Run npm install.'
    );
  }
  console.log('📂 Step 1: Copying @project-sunbird/content-player npm package...');
  copyDirectory(NPM_PACKAGE, DEST, SKIP_FILES);

  // Step 2: Overlay local overrides on top (wins over npm files)
  if (fs.existsSync(LOCAL_OVERRIDES)) {
    console.log('📂 Step 2: Overlaying local overrides from content-player/...');
    copyDirectory(LOCAL_OVERRIDES, DEST);
  } else {
    console.log('📂 Step 2: No local content-player/ overrides found, skipping.');
  }

  console.log('\n✅ content-player assembled at public/content-player/');
  console.log('   Files:');
  const files = fs.readdirSync(DEST);
  for (const f of files) {
    const stat = fs.statSync(path.join(DEST, f));
    console.log(`   ${stat.isDirectory() ? '📁' : '📄'} ${f}`);
  }
} catch (error) {
  console.error('❌ Error assembling content-player:', error.message);
  process.exit(1);
}
