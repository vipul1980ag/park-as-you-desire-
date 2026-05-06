'use strict';
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const OUT = path.join(__dirname, 'mobile/assets');
fs.mkdirSync(OUT, { recursive: true });

function makeSVG(size, forAdaptive) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%"   stop-color="#1a3a6e"/>
      <stop offset="100%" stop-color="#060e1f"/>
    </radialGradient>
    <radialGradient id="globeGrad" cx="42%" cy="38%" r="60%">
      <stop offset="0%"   stop-color="#4a90e2"/>
      <stop offset="55%"  stop-color="#1a56c4"/>
      <stop offset="100%" stop-color="#0a2a7a"/>
    </radialGradient>
    <linearGradient id="yellowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#ffff55"/>
      <stop offset="45%"  stop-color="#ffe000"/>
      <stop offset="100%" stop-color="#ffb300"/>
    </linearGradient>
    <radialGradient id="shineGrad" cx="38%" cy="32%" r="45%">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.22)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="textShadow">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
    <filter id="dnwShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,80,0.6)"/>
    </filter>
    <path id="ringPath" d="M512,512 m-310,0 a310,310 0 1,1 620,0 a310,310 0 1,1 -620,0"/>
  </defs>

  ${forAdaptive ? '' : '<rect width="1024" height="1024" fill="url(#bgGrad)"/>'}

  <circle cx="80"  cy="80"  r="3" fill="#60a5fa" opacity="0.4"/>
  <circle cx="944" cy="80"  r="2" fill="#60a5fa" opacity="0.3"/>
  <circle cx="80"  cy="944" r="2" fill="#60a5fa" opacity="0.3"/>
  <circle cx="944" cy="944" r="3" fill="#60a5fa" opacity="0.4"/>
  <circle cx="180" cy="130" r="1.5" fill="#93c5fd" opacity="0.5"/>

  <circle cx="512" cy="512" r="362" fill="none"
    stroke="rgba(96,165,250,0.18)" stroke-width="2" filter="url(#glow)"/>
  <circle cx="512" cy="512" r="340" fill="url(#globeGrad)"/>

  <ellipse cx="512" cy="512" rx="340" ry="105" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1.5"/>
  <ellipse cx="512" cy="512" rx="340" ry="205" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1.2"/>
  <ellipse cx="512" cy="512" rx="110" ry="340" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1.5"/>
  <ellipse cx="512" cy="512" rx="220" ry="340" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.2"/>
  <line x1="172" y1="512" x2="852" y2="512" stroke="rgba(255,255,255,0.13)" stroke-width="1.5"/>

  <circle cx="512" cy="512" r="340" fill="none" stroke="rgba(147,197,253,0.50)" stroke-width="2.5"/>
  <circle cx="512" cy="512" r="340" fill="url(#shineGrad)"/>

  <text font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="700"
    fill="rgba(180,220,255,0.55)" letter-spacing="8">
    <textPath href="#ringPath" startOffset="0%">DNEXTWELT · DNEXTWELT · DNEXTWELT ·</textPath>
  </text>

  <text x="512" y="476" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial Black,Arial,sans-serif"
    font-size="148" font-weight="900" letter-spacing="-4"
    fill="#ffffff" filter="url(#dnwShadow)">DNW</text>

  <line x1="342" y1="510" x2="682" y2="510" stroke="rgba(255,220,0,0.65)" stroke-width="2"/>

  <text x="512" y="612" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial Black,Arial,sans-serif"
    font-size="108" font-weight="900" letter-spacing="2"
    fill="url(#yellowGrad)" filter="url(#textShadow)">PARK</text>

  <text x="512" y="892" text-anchor="middle"
    font-family="Arial,Helvetica,sans-serif"
    font-size="32" font-weight="700" letter-spacing="5"
    fill="rgba(148,163,184,0.80)">AS YOU DESIRE</text>
</svg>`;
}

function makeSplashSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1284" height="2778" viewBox="0 0 1284 2778">
  <defs>
    <radialGradient id="bgG" cx="50%" cy="45%" r="65%">
      <stop offset="0%"   stop-color="#1a3a6e"/>
      <stop offset="100%" stop-color="#060e1f"/>
    </radialGradient>
    <radialGradient id="globeG" cx="42%" cy="38%" r="60%">
      <stop offset="0%"   stop-color="#4a90e2"/>
      <stop offset="55%"  stop-color="#1a56c4"/>
      <stop offset="100%" stop-color="#0a2a7a"/>
    </radialGradient>
    <linearGradient id="yellowG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#ffff55"/>
      <stop offset="45%"  stop-color="#ffe000"/>
      <stop offset="100%" stop-color="#ffb300"/>
    </linearGradient>
    <radialGradient id="shineG" cx="38%" cy="32%" r="45%">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.20)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <path id="rp" d="M642,1250 m-290,0 a290,290 0 1,1 580,0 a290,290 0 1,1 -580,0"/>
    <filter id="glow2">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="textShadow2">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
  </defs>

  <rect width="1284" height="2778" fill="url(#bgG)"/>

  <circle cx="642" cy="1250" r="338" fill="none"
    stroke="rgba(96,165,250,0.20)" stroke-width="2" filter="url(#glow2)"/>
  <circle cx="642" cy="1250" r="318" fill="url(#globeG)"/>
  <ellipse cx="642" cy="1250" rx="318" ry="98"  fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1.5"/>
  <ellipse cx="642" cy="1250" rx="318" ry="192" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1.2"/>
  <ellipse cx="642" cy="1250" rx="102" ry="318" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1.5"/>
  <line x1="324" y1="1250" x2="960" y2="1250" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
  <circle cx="642" cy="1250" r="318" fill="none" stroke="rgba(147,197,253,0.50)" stroke-width="2.5"/>
  <circle cx="642" cy="1250" r="318" fill="url(#shineG)"/>

  <text font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="700"
    fill="rgba(180,220,255,0.50)" letter-spacing="7">
    <textPath href="#rp" startOffset="0%">DNEXTWELT · DNEXTWELT · DNEXTWELT ·</textPath>
  </text>

  <text x="642" y="1218" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial Black,Arial,sans-serif"
    font-size="138" font-weight="900" letter-spacing="-3" fill="#ffffff">DNW</text>

  <line x1="482" y1="1252" x2="802" y2="1252" stroke="rgba(255,220,0,0.65)" stroke-width="2"/>

  <text x="642" y="1346" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial Black,Arial,sans-serif"
    font-size="100" font-weight="900" letter-spacing="2"
    fill="url(#yellowG)" filter="url(#textShadow2)">PARK</text>

  <text x="642" y="1640" text-anchor="middle"
    font-family="Arial,Helvetica,sans-serif"
    font-size="52" font-weight="900" letter-spacing="-1" fill="#f1f5f9">Park As You Desire</text>
  <text x="642" y="1706" text-anchor="middle"
    font-family="Arial,Helvetica,sans-serif"
    font-size="30" font-weight="400" letter-spacing="2" fill="rgba(148,163,184,0.75)">Find Parking Instantly</text>
</svg>`;
}

async function generate() {
  console.log('Generating Park As You Desire icons...');
  await sharp(Buffer.from(makeSVG(1024, false))).resize(1024,1024).png().toFile(path.join(OUT,'icon.png'));
  console.log('✓ icon.png');
  await sharp(Buffer.from(makeSVG(1024, true))).resize(1024,1024).png().toFile(path.join(OUT,'adaptive-icon.png'));
  console.log('✓ adaptive-icon.png');
  await sharp(Buffer.from(makeSVG(96, false))).resize(96,96).png().toFile(path.join(OUT,'favicon.png'));
  console.log('✓ favicon.png');
  await sharp(Buffer.from(makeSplashSVG())).resize(1284,2778).png().toFile(path.join(OUT,'splash.png'));
  console.log('✓ splash.png');
  console.log('All icons generated.');
}

generate().catch(e => { console.error(e); process.exit(1); });
