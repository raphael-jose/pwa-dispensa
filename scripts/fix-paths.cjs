const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

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

// Fix index.html - replace absolute paths with base-prefixed paths
const htmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// Fix asset paths: src="/assets/..." -> src="/pwa-dispensa/assets/..."
// Fix registerSW: src="/registerSW.js" -> src="/pwa-dispensa/registerSW.js"
// Fix manifest link: href="/manifest.webmanifest" -> href="/pwa-dispensa/manifest.webmanifest"
html = html.replace(/(src|href)=\"\/assets\//g, '$1="/pwa-dispensa/assets/');
html = html.replace(/(src|href)=\"\/registerSW\.js\"/g, '$1="/pwa-dispensa/registerSW.js"');
html = html.replace(/href=\"\/manifest\.webmanifest\"/g, 'href="/pwa-dispensa/manifest.webmanifest"');

// Remove duplicate manifest link (keep only the one with correct path)
html = html.replace(/<link rel="manifest" href="\.\/manifest\.webmanifest" \/>\n/, '');

fs.writeFileSync(htmlPath, html);
console.log('✅ index.html paths fixed');
