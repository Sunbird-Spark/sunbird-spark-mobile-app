import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n📦 Consolidating player assets...\n');

const publicRoot = path.join(__dirname, 'public');

const players = [
  {
    name: 'PDF Player',
    package: '@project-sunbird/sunbird-pdf-player-web-component',
    assetDir: 'pdf-player',
  },
  {
    name: 'Video Player',
    package: '@project-sunbird/sunbird-video-player-web-component',
    assetDir: 'video-player',
  },
  {
    name: 'ePub Player',
    package: '@project-sunbird/sunbird-epub-player-web-component',
    assetDir: 'epub-player',
  },
  {
    name: 'QuML Player',
    package: '@project-sunbird/sunbird-quml-player-web-component',
    assetDir: 'quml-player',
  },
];

/**
 * Recursively copy directory contents from src to dest.
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(
      `Source directory "${src}" does not exist. This may indicate a missing npm package or an incorrect path.`
    );
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // Clean existing assets folder to start fresh
  const assetsDir = path.join(publicRoot, 'assets');
  if (fs.existsSync(assetsDir)) {
    console.log('🧹 Cleaning existing assets folder...');
    fs.rmSync(assetsDir, { recursive: true, force: true });
  }

  for (const player of players) {
    const packageRoot = path.join(__dirname, 'node_modules', player.package);
    const assetsSource = path.join(packageRoot, 'assets', player.assetDir);
    const assetsDest = path.join(publicRoot, 'assets', player.assetDir);

    console.log(`📂 ${player.name} Source: ${assetsSource}`);
    fs.mkdirSync(assetsDest, { recursive: true });
    console.log(`📦 Copying ${player.name} files to public/assets/${player.assetDir}/...`);
    copyDirectory(assetsSource, assetsDest);
  }

  // Copy shared SVG icons to public/assets/ for components that expect them at /assets/*.svg
  console.log('\n📦 Copying common icons to public/assets/...');
  const pdfAssetsSource = path.join(
    __dirname,
    'node_modules/@project-sunbird/sunbird-pdf-player-web-component/assets/pdf-player'
  );
  const pdfIcons = fs.readdirSync(pdfAssetsSource).filter((file) => file.endsWith('.svg'));
  for (const icon of pdfIcons) {
    fs.copyFileSync(
      path.join(pdfAssetsSource, icon),
      path.join(publicRoot, 'assets', icon)
    );
  }

  const qumlAssetsIconsDir = path.join(
    __dirname,
    'node_modules/@project-sunbird/sunbird-quml-player-web-component/assets/quml-player/assets'
  );
  if (fs.existsSync(qumlAssetsIconsDir)) {
    const qumlIcons = fs.readdirSync(qumlAssetsIconsDir).filter((file) => file.endsWith('.svg'));
    for (const icon of qumlIcons) {
      fs.copyFileSync(
        path.join(qumlAssetsIconsDir, icon),
        path.join(publicRoot, 'assets', icon)
      );
    }
  }

  console.log('\n✅ Assets consolidated successfully!');
  for (const player of players) {
    console.log(`📍 ${player.name}: public/assets/${player.assetDir}/`);
  }
  console.log(`📍 Common Icons: public/assets/*.svg`);
} catch (error) {
  console.error('❌ Error consolidating assets:', error.message);
  process.exit(1);
}
