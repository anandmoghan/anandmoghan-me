#!/usr/bin/env node

/**
 * Get R2 Public URL
 * 
 * Shows the public URL for your R2 bucket
 */

import 'dotenv/config';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const bucketName = process.env.R2_BUCKET_NAME || 'anandmoghan-media';

console.log('\n📍 R2 Bucket Information\n');
console.log(`Bucket Name: ${bucketName}`);
console.log(`Account ID: ${accountId}\n`);

console.log('To enable public access:');
console.log('1. Go to Cloudflare Dashboard → R2');
console.log(`2. Click on bucket: ${bucketName}`);
console.log('3. Go to Settings → Public Access');
console.log('4. Click "Allow Access"');
console.log('5. Copy the public bucket URL (e.g., https://pub-xxxxx.r2.dev)\n');

console.log('Then add to your .env file:');
console.log('NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev\n');

console.log('Or configure custom domain:');
console.log('1. In R2 bucket settings, go to "Custom Domains"');
console.log('2. Add domain: media.anandmoghan.me');
console.log('3. Follow DNS setup instructions');
console.log('4. Add to .env: NEXT_PUBLIC_MEDIA_URL=https://media.anandmoghan.me\n');
