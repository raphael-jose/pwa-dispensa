const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const rootDir = path.join(__dirname, '..');

// Create .nojekyll for GitHub Pages
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
console.log('✅ .nojekyll created');

// Fix manifest.webmanifest
const manifest = {
  name: 'Despensa - Controle de Estoque',
  short_name: 'Despensa',
  description: 'Controle inteligente de despensa com leitor de código de barras',
  start_url: '/pwa-dispensa/',
  scope: '/pwa-dispensa/',
  display: 'standalone',
  background_color: '#f0fdf4',
  theme_color: '#059669',
  orientation: 'portrait',
  lang: 'pt-BR',
  icons: [
    { src: '/pwa-dispensa/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/pwa-dispensa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
};
fs.writeFileSync(path.join(distDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
console.log('✅ manifest.webmanifest fixed');

// Fix index.html - use relative paths (./assets/...) instead of absolute
const htmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// Fix asset paths to be relative: /pwa-dispensa/assets/... -> ./assets/...
html = html.replace(/\/pwa-dispensa\/assets\//g, './assets/');
html = html.replace(/\/pwa-dispensa\/manifest\.webmanifest/g, './manifest.webmanifest');
html = html.replace(/\/pwa-dispensa\/registerSW\.js/g, './registerSW.js');

// Also fix any bare /assets/ paths
html = html.replace(/(src|href)="\/assets\//g, '$1="./assets/');

// Remove duplicate manifest links
const seen = new Set();
html = html.replace(/<link rel="manifest" href="[^"]*"\/?>\s*\n?/g, (match) => {
  if (seen.has('manifest')) return '';
  seen.add('manifest');
  return match;
});

fs.writeFileSync(htmlPath, html);
console.log('✅ index.html paths fixed (relative)');

// Also fix the root index.html if it exists
const rootHtmlPath = path.join(rootDir, 'index.html');
if (fs.existsSync(rootHtmlPath)) {
  let rootHtml = fs.readFileSync(rootHtmlPath, 'utf-8');
  rootHtml = rootHtml.replace(/\/pwa-dispensa\/assets\//g, './assets/');
  rootHtml = rootHtml.replace(/\/pwa-dispensa\/manifest\.webmanifest/g, './manifest.webmanifest');
  rootHtml = rootHtml.replace(/\/pwa-dispensa\/registerSW\.js/g, './registerSW.js');
  fs.writeFileSync(rootHtmlPath, rootHtml);
  console.log('✅ root index.html paths fixed');
}

// Copy critical files to root for GitHub Pages
const filesToCopy = ['index.html', 'sw.js', 'registerSW.js', 'manifest.webmanifest'];
const workboxFiles = fs.readdirSync(distDir).filter(f => f.startsWith('workbox-'));

[...filesToCopy, ...workboxFiles].forEach(file => {
  const src = path.join(distDir, file);
  const dest = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✅ Copied ${file} to root`);
  }
});

// Copy assets directory to root
const rootAssetsDir = path.join(rootDir, 'assets');
const distAssetsDir = path.join(distDir, 'assets');
if (fs.existsSync(distAssetsDir)) {
  if (!fs.existsSync(rootAssetsDir)) fs.mkdirSync(rootAssetsDir, { recursive: true });
  fs.readdirSync(distAssetsDir).forEach(file => {
    fs.copyFileSync(path.join(distAssetsDir, file), path.join(rootAssetsDir, file));
  });
  console.log('✅ Copied assets/ to root');
}

// Copy .nojekyll to root
fs.writeFileSync(path.join(rootDir, '.nojekyll'), '');
console.log('✅ .nojekyll copied to root');

console.log('\n🎉 Deploy ready!');
