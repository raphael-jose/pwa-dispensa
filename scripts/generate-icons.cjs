const sharp = require('sharp');
const path = require('path');

const SIZES = [192, 512];

function createIconSVG(size) {
  const r = size * 0.12;
  const boxW = size * 0.48;
  const boxH = size * 0.36;
  const boxX = (size - boxW) / 2;
  const boxY = size * 0.28;
  const flapH = size * 0.1;
  const flapY = boxY - flapH;
  const cx = size * 0.72;
  const cy = size * 0.72;
  const checkR = size * 0.13;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="boxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f0fdf4"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="${size*0.01}" stdDeviation="${size*0.015}" flood-color="#000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <!-- Subtle pattern -->
  <circle cx="${size*0.15}" cy="${size*0.15}" r="${size*0.08}" fill="white" opacity="0.05"/>
  <circle cx="${size*0.85}" cy="${size*0.85}" r="${size*0.12}" fill="white" opacity="0.05"/>
  <!-- Box body -->
  <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="${size*0.025}" fill="url(#boxGrad)" filter="url(#shadow)"/>
  <!-- Box flaps -->
  <rect x="${boxX}" y="${flapY}" width="${boxW*0.48}" height="${flapH}" rx="${size*0.02}" fill="white" opacity="0.9"/>
  <rect x="${boxX+boxW*0.52}" y="${flapY}" width="${boxW*0.48}" height="${flapH}" rx="${size*0.02}" fill="white" opacity="0.75"/>
  <!-- Flap divider -->
  <line x1="${boxX+boxW*0.5}" y1="${flapY}" x2="${boxX+boxW*0.5}" y2="${boxY+boxH}" stroke="#d1d5db" stroke-width="${size*0.006}"/>
  <!-- Horizontal line -->
  <line x1="${boxX}" y1="${boxY+boxH*0.5}" x2="${boxX+boxW}" y2="${boxY+boxH*0.5}" stroke="#e5e7eb" stroke-width="${size*0.004}"/>
  <!-- Small product lines -->
  <rect x="${boxX+boxW*0.12}" y="${boxY+boxH*0.2}" width="${boxW*0.25}" height="${size*0.015}" rx="${size*0.005}" fill="#93c5fd"/>
  <rect x="${boxX+boxW*0.12}" y="${boxY+boxH*0.65}" width="${boxW*0.25}" height="${size*0.015}" rx="${size*0.005}" fill="#86efac"/>
  <rect x="${boxX+boxW*0.55}" y="${boxY+boxH*0.2}" width="${boxW*0.3}" height="${size*0.015}" rx="${size*0.005}" fill="#fca5a5"/>
  <rect x="${boxX+boxW*0.55}" y="${boxY+boxH*0.65}" width="${boxW*0.3}" height="${size*0.015}" rx="${size*0.005}" fill="#fde68a"/>
  <!-- Checkmark circle -->
  <circle cx="${cx}" cy="${cy}" r="${checkR}" fill="#dcfce7" stroke="#16a34a" stroke-width="${size*0.012}"/>
  <!-- Checkmark -->
  <polyline points="${cx-checkR*0.55},${cy} ${cx-checkR*0.1},${cy+checkR*0.45} ${cx+checkR*0.6},${cy-checkR*0.35}" 
    fill="none" stroke="#16a34a" stroke-width="${size*0.018}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

async function generateIcons() {
  for (const size of SIZES) {
    const svg = createIconSVG(size);
    const outputPath = path.join(__dirname, '..', 'public', `icon-${size}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
    console.log(`✅ icon-${size}.png generated`);
  }
}

generateIcons().catch(console.error);
