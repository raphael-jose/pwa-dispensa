const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const rootDir = path.join(__dirname, '..');

// ==================== 1. Clean old build artifacts from root ====================
console.log('🧹 Cleaning old build artifacts from root...');

// Remove old root assets directory
const rootAssetsDir = path.join(rootDir, 'assets');
if (fs.existsSync(rootAssetsDir)) {
  fs.rmSync(rootAssetsDir, { recursive: true, force: true });
  console.log('  Removed old assets/');
}

// Remove old root build files
const oldRootFiles = ['sw.js', 'registerSW.js', 'manifest.webmanifest', 'workbox-*.js', '.nojekyll'];
oldRootFiles.forEach(pattern => {
  if (pattern.includes('*')) {
    // Glob pattern
    const prefix = pattern.replace('*', '');
    fs.readdirSync(rootDir).forEach(f => {
      if (f.startsWith(prefix) && f !== pattern) {
        fs.unlinkSync(path.join(rootDir, f));
        console.log(`  Removed ${f}`);
      }
    });
  } else {
    const filePath = path.join(rootDir, pattern);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`  Removed ${pattern}`);
    }
  }
});

// ==================== 2. Fix dist files ====================
console.log('\n📝 Fixing dist files...');

// Create .nojekyll for GitHub Pages
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

// Fix manifest.webmanifest
const manifest = {
  name: 'Despensa - Controle de Estoque',
  short_name: 'Despensa',
  description: 'Controle inteligente de despensa com leitor de código de barras',
  start_url: '/pwa-dispensa/',
  scope: '/pwa-dispensa/',
  display: 'standalone',
  background_color: '#f9fafb',
  theme_color: '#059669',
  orientation: 'portrait',
  lang: 'pt-BR',
  icons: [
    { src: '/pwa-dispensa/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/pwa-dispensa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
};
fs.writeFileSync(path.join(distDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// Fix index.html - use relative paths
const htmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');
html = html.replace(/\/pwa-dispensa\/assets\//g, './assets/');
html = html.replace(/\/pwa-dispensa\/manifest\.webmanifest/g, './manifest.webmanifest');
html = html.replace(/\/pwa-dispensa\/registerSW\.js/g, './registerSW.js');
html = html.replace(/(src|href)="\/assets\//g, '$1="./assets/');

// Remove duplicate manifest links
const seen = new Set();
html = html.replace(/<link rel="manifest" href="[^"]*"\/?>\s*\n?/g, (match) => {
  if (seen.has('manifest')) return '';
  seen.add('manifest');
  return match;
});
fs.writeFileSync(htmlPath, html);
console.log('✅ dist/index.html fixed');

// ==================== 3. Copy dist → root ====================
console.log('\n📦 Copying dist → root...');

// Copy all files from dist to root
const distFiles = fs.readdirSync(distDir);
distFiles.forEach(file => {
  if (file === 'assets') return; // handle separately
  const src = path.join(distDir, file);
  const dest = path.join(rootDir, file);
  fs.copyFileSync(src, dest);
});
console.log('✅ Copied root files');

// Copy assets directory
const distAssetsDir = path.join(distDir, 'assets');
if (fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(rootAssetsDir, { recursive: true });
  fs.readdirSync(distAssetsDir).forEach(file => {
    fs.copyFileSync(path.join(distAssetsDir, file), path.join(rootAssetsDir, file));
  });
  console.log('✅ Copied assets/');
}

console.log('\n🎉 Deploy ready!');
