#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');

const FILES = {
  capacitorConfigTs: path.join(ROOT, 'capacitor.config.ts'),
  capacitorConfigJson: path.join(ROOT, 'android/app/src/main/assets/capacitor.config.json'),
  buildGradle: path.join(ROOT, 'android/app/build.gradle'),
  stringsXml: path.join(ROOT, 'android/app/src/main/res/values/strings.xml'),
  javaRoot: path.join(ROOT, 'android/app/src/main/java'),
};

function validateAppId(id) {
  const segments = id.split('.');
  if (segments.length < 2) {
    throw new Error('App ID must have at least 2 segments (e.g. org.example)');
  }
  for (const seg of segments) {
    if (!seg) throw new Error('App ID must not have empty segments');
    if (/^\d/.test(seg)) throw new Error(`Segment "${seg}" must not start with a digit`);
    if (!/^[a-zA-Z0-9_]+$/.test(seg))
      throw new Error(`Segment "${seg}" contains invalid characters`);
  }
}

function detectCurrentAppId() {
  const content = fs.readFileSync(FILES.capacitorConfigTs, 'utf8');
  const match = content.match(/appId:\s*(['"])([^'"]+)\1/);
  if (!match) throw new Error('Could not detect current appId from capacitor.config.ts');
  return { id: match[2], quote: match[1] };
}

function idToPath(id) {
  return id.split('.').join('/');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Snapshot all flat files so we can restore on failure
function snapshotFiles() {
  const snapshot = {};
  for (const [key, filePath] of Object.entries(FILES)) {
    if (key === 'javaRoot') continue;
    if (fs.existsSync(filePath)) {
      snapshot[filePath] = fs.readFileSync(filePath, 'utf8');
    }
  }
  return snapshot;
}

function restoreFiles(snapshot) {
  for (const [filePath, content] of Object.entries(snapshot)) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function updateFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }

  if (content === original) {
    console.log(`  (no change)  ${path.relative(ROOT, filePath)}`);
    return;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  updated      ${path.relative(ROOT, filePath)}`);
}

function updateJavaFiles(oldId, newId) {
  const oldDir = path.join(FILES.javaRoot, idToPath(oldId));
  const newDir = path.join(FILES.javaRoot, idToPath(newId));

  if (!fs.existsSync(oldDir)) {
    console.log(`  (not found)  android/.../java/${idToPath(oldId)}/`);
    return;
  }

  const javaFiles = fs.readdirSync(oldDir).filter((f) => f.endsWith('.java'));

  if (javaFiles.length === 0) {
    console.log(`  (no .java files found in ${idToPath(oldId)}/)`);
    return;
  }

  fs.mkdirSync(newDir, { recursive: true });

  for (const file of javaFiles) {
    const oldFile = path.join(oldDir, file);
    let content = fs.readFileSync(oldFile, 'utf8');
    content = content.replace(`package ${oldId};`, `package ${newId};`);
    fs.writeFileSync(path.join(newDir, file), content, 'utf8');
    fs.unlinkSync(oldFile);
    console.log(
      `  moved        android/.../java/${idToPath(oldId)}/${file} → ${idToPath(newId)}/${file}`,
    );
  }

  // Remove old empty directories bottom-up
  let dir = oldDir;
  while (dir !== FILES.javaRoot) {
    if (fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
      dir = path.dirname(dir);
    } else {
      break;
    }
  }
}

function main() {
  const newId = process.argv[2];

  if (!newId) {
    console.error('Usage: node scripts/update-app-id.js <new-app-id>');
    console.error('Example: node scripts/update-app-id.js org.example.myapp');
    process.exit(1);
  }

  try {
    validateAppId(newId);
  } catch (err) {
    console.error(`Invalid app ID: ${err.message}`);
    process.exit(1);
  }

  const { id: oldId, quote } = detectCurrentAppId();

  if (oldId === newId) {
    console.log(`App ID is already "${newId}". Nothing to do.`);
    process.exit(0);
  }

  console.log(`\nUpdating app ID: ${oldId} → ${newId}\n`);

  const snapshot = snapshotFiles();

  try {
    updateFile(FILES.capacitorConfigTs, [
      // preserve original quote style (single or double)
      [
        new RegExp(`appId:\\s*${quote}${escapeRegex(oldId)}${quote}`),
        `appId: ${quote}${newId}${quote}`,
      ],
    ]);

    updateFile(FILES.capacitorConfigJson, [
      [new RegExp(`"appId":\\s*"${escapeRegex(oldId)}"`), `"appId": "${newId}"`],
    ]);

    updateFile(FILES.buildGradle, [
      [new RegExp(`namespace\\s+"${escapeRegex(oldId)}"`), `namespace "${newId}"`],
      [new RegExp(`applicationId\\s+"${escapeRegex(oldId)}"`), `applicationId "${newId}"`],
    ]);

    updateFile(FILES.stringsXml, [
      [
        new RegExp(`(<string name="package_name">)${escapeRegex(oldId)}(</string>)`),
        `$1${newId}$2`,
      ],
      [
        new RegExp(`(<string name="custom_url_scheme">)${escapeRegex(oldId)}(</string>)`),
        `$1${newId}$2`,
      ],
    ]);

    updateJavaFiles(oldId, newId);
  } catch (err) {
    console.error(`\nError during update: ${err.message}`);
    console.error('Rolling back all file changes...');
    restoreFiles(snapshot);
    console.error('Rollback complete. No files were changed.');
    process.exit(1);
  }

  console.log('\nRunning npx cap sync android...\n');
  try {
    execSync('npx cap sync android', { cwd: ROOT, stdio: 'inherit' });
  } catch {
    console.error('\nWarning: cap sync failed. Run "npx cap sync android" manually.');
  }

  console.log('\nDone. App ID updated to:', newId);
  console.log(
    'Remember: if this is an existing Play Console app, the new ID must be registered there too.\n',
  );
}

main();
