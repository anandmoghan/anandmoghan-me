#!/usr/bin/env node

/**
 * Generate PNG favicons from SVG
 * 
 * This script creates PNG favicons in the required sizes for Google Search and browsers.
 * 
 * Usage:
 *   node scripts/generate-favicons.js
 * 
 * Requirements:
 *   npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed.');
  console.error('Please run: npm install sharp');
  process.exit(1);
}

const svgPath = path.join(__dirname, '../public/favicon.svg');
const publicDir = path.join(__dirname, '../public');

const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

async function generateFavicons() {
  console.log('Generating favicons from SVG...\n');

  if (!fs.existsSync(svgPath)) {
    console.error(`Error: ${svgPath} not found`);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  for (const { size, name } of sizes) {
    try {
      const outputPath = path.join(publicDir, name);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
    }
  }

  console.log('\n✓ All favicons generated successfully!');
  console.log('\nGenerated files:');
  sizes.forEach(({ name }) => {
    console.log(`  - public/${name}`);
  });
}

generateFavicons().catch(error => {
  console.error('Error generating favicons:', error);
  process.exit(1);
});
