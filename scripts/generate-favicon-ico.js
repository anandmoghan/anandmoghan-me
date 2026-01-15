#!/usr/bin/env node

/**
 * Generate favicon.ico from PNG
 * 
 * This creates a multi-resolution ICO file for maximum browser compatibility.
 * 
 * Usage:
 *   node scripts/generate-favicon-ico.js
 * 
 * Requirements:
 *   npm install sharp to-ico
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Check if to-ico is installed
let toIco;
try {
  toIco = require('to-ico');
} catch (e) {
  console.error('Error: to-ico is not installed.');
  console.error('Please run: npm install to-ico');
  console.error('\nSkipping favicon.ico generation (optional)');
  process.exit(0);
}

const svgPath = path.join(__dirname, '../public/favicon.svg');
const outputPath = path.join(__dirname, '../public/favicon.ico');

async function generateFaviconIco() {
  console.log('Generating favicon.ico...\n');

  if (!fs.existsSync(svgPath)) {
    console.error(`Error: ${svgPath} not found`);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // Generate 16x16 and 32x32 PNGs for ICO
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();

  // Create ICO file with multiple sizes
  const icoBuffer = await toIco([png16, png32]);
  
  fs.writeFileSync(outputPath, icoBuffer);
  
  console.log('✓ Generated favicon.ico (16x16 + 32x32)');
  console.log(`  - public/favicon.ico`);
}

generateFaviconIco().catch(error => {
  console.error('Error generating favicon.ico:', error.message);
  console.error('\nThis is optional - the PNG favicons will work fine.');
  process.exit(0);
});
