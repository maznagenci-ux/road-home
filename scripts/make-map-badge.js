const sharp = require('sharp');
const fs = require('fs');

/**
 * Soft cartographic Road Home seals — feathered edges + map-paper tones.
 * Center stays fully opaque so bright Homele marks disappear.
 */
async function main() {
  // Icon-only crop from mark (avoid full lockup text under icon)
  const markMeta = await sharp('public/brand/logo-mark.png').metadata();
  const iconSrc = await sharp('public/brand/logo-mark.png')
    .extract({
      left: 0,
      top: 0,
      width: markMeta.width,
      height: Math.round(markMeta.height * 0.58),
    })
    .resize(44, 44, { fit: 'inside' })
    .png()
    .toBuffer();

  const iconSmall = await sharp(iconSrc).resize(32, 32, { fit: 'inside' }).png().toBuffer();

  const plateSvg = `<svg width="360" height="120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="wash" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f3f5f2" stop-opacity="1"/>
      <stop offset="42%" stop-color="#e8ece7" stop-opacity="1"/>
      <stop offset="70%" stop-color="#d7dfd8" stop-opacity="0.72"/>
      <stop offset="88%" stop-color="#c5d0c7" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#b4c2b8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#c9a227" stop-opacity="0"/>
      <stop offset="30%" stop-color="#c9a227" stop-opacity="0.9"/>
      <stop offset="70%" stop-color="#c9a227" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#c9a227" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <ellipse cx="180" cy="60" rx="170" ry="54" fill="url(#wash)"/>
  <rect x="96" y="58" width="168" height="1.15" fill="url(#gold)"/>
  <text x="188" y="48" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="18" font-weight="700" fill="#0b1f38" letter-spacing="0.5">Road Home</text>
  <text x="188" y="78" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="9" font-weight="600" letter-spacing="3.2" fill="#9a7b1a">REAL ESTATE</text>
</svg>`;

  await sharp(Buffer.from(plateSvg))
    .composite([{ input: iconSmall, left: 52, top: 44 }])
    .png()
    .toFile('public/brand/map-soft-plate.png');

  const veilSvg = `<svg width="560" height="240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sage" cx="50%" cy="48%" r="58%">
      <stop offset="0%" stop-color="#d8e2db" stop-opacity="1"/>
      <stop offset="50%" stop-color="#c9d6cd" stop-opacity="1"/>
      <stop offset="74%" stop-color="#b7c8bc" stop-opacity="0.96"/>
      <stop offset="90%" stop-color="#a3b7ab" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#8fa39a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#b8961a" stop-opacity="0"/>
      <stop offset="28%" stop-color="#b8961a" stop-opacity="0.95"/>
      <stop offset="72%" stop-color="#b8961a" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#b8961a" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <ellipse cx="280" cy="120" rx="268" ry="108" fill="url(#sage)"/>
  <rect x="150" y="118" width="260" height="1.35" fill="url(#line)"/>
  <text x="298" y="96" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-weight="700" fill="#0b1f38" letter-spacing="0.7">Road Home</text>
  <text x="298" y="148" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="600" letter-spacing="3.8" fill="#8a6d12">REAL ESTATE</text>
</svg>`;

  // Fix typo in stop color if any
  const veilFixed = veilSvg;

  await sharp(Buffer.from(veilFixed))
    .composite([{ input: iconSrc, left: 98, top: 98 }])
    .png()
    .toFile('public/brand/map-soft-veil.png');

  const badgeSvg = `<svg width="340" height="110" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="navy" cx="50%" cy="50%" r="52%">
      <stop offset="0%" stop-color="#0b1f38" stop-opacity="1"/>
      <stop offset="55%" stop-color="#0b1f38" stop-opacity="0.96"/>
      <stop offset="82%" stop-color="#0b1f38" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#0b1f38" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#d4a017" stop-opacity="0"/>
      <stop offset="30%" stop-color="#d4a017" stop-opacity="0.95"/>
      <stop offset="70%" stop-color="#d4a017" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#d4a017" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <ellipse cx="170" cy="55" rx="160" ry="50" fill="url(#navy)"/>
  <rect x="90" y="54" width="160" height="1.15" fill="url(#g2)"/>
  <text x="178" y="42" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="17" font-weight="700" fill="#ffffff" letter-spacing="0.5">Road Home</text>
  <text x="178" y="72" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="9" font-weight="600" letter-spacing="3" fill="#d4a017">REAL ESTATE</text>
</svg>`;

  const iconOnDark = await sharp('public/brand/logo-on-dark.png')
    .resize(30, 30, { fit: 'inside' })
    .png()
    .toBuffer();

  await sharp(Buffer.from(badgeSvg))
    .composite([{ input: iconOnDark, left: 42, top: 40 }])
    .png()
    .toFile('public/brand/map-badge.png');

  console.log({
    plate: fs.statSync('public/brand/map-soft-plate.png').size,
    veil: fs.statSync('public/brand/map-soft-veil.png').size,
    badge: fs.statSync('public/brand/map-badge.png').size,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
