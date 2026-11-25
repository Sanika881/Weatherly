import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST_ASSETS_DIR = path.resolve(process.cwd(), 'dist/assets');
const INITIAL_BUDGET_BYTES = 45 * 1024; // 35 KB base + ~10 KB interactive layer

if (!fs.existsSync(DIST_ASSETS_DIR)) {
  console.error('dist/assets not found. Run `npm run build` first.');
  process.exit(1);
}

const files = fs.readdirSync(DIST_ASSETS_DIR).filter((f) => f.endsWith('.js'));

const LAZY_CHUNKS = ['SettingsModal', 'CommandPalette', 'CompareModal', 'ambientSound', 'shareCard'];

let initialAppGzip = 0;
let lazyAppGzip = 0;
let vendorGzipTotal = 0;

console.log('\nWeatherly Bundle Size Report (gzipped):');
for (const file of files) {
  const content = fs.readFileSync(path.join(DIST_ASSETS_DIR, file));
  const gzipped = zlib.gzipSync(content, {level: 9}).length;
  const kb = (gzipped / 1024).toFixed(2);
  const isVendor = file.startsWith('vendor-');
  const isLazy = LAZY_CHUNKS.some((name) => file.startsWith(name));
  if (isVendor) {
    vendorGzipTotal += gzipped;
  } else if (isLazy) {
    lazyAppGzip += gzipped;
  } else {
    initialAppGzip += gzipped;
  }
  const tag = isVendor ? '[vendor]' : isLazy ? '[lazy]  ' : '[app]   ';
  console.log(`  ${tag} ${file}: ${kb} KB`);
}

console.log(`\nInitial app bundle: ${(initialAppGzip / 1024).toFixed(2)} KB / 45.00 KB budget`);
console.log(`Lazy-loaded chunks: ${(lazyAppGzip / 1024).toFixed(2)} KB`);
console.log(`Vendor chunks:      ${(vendorGzipTotal / 1024).toFixed(2)} KB\n`);

if (initialAppGzip > INITIAL_BUDGET_BYTES) {
  console.error(
    `Bundle budget exceeded: initial app code is ${(initialAppGzip / 1024).toFixed(2)} KB.`
  );
  process.exit(1);
}
