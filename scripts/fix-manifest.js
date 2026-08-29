const fs = require('fs');
const path = require('path');

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

const distPath = path.join(__dirname, '..', 'dist', 'manifest.webmanifest');
fs.writeFileSync(distPath, JSON.stringify(manifest, null, 2));
console.log('✅ Manifest fixed with /pwa-dispensa/ paths');
