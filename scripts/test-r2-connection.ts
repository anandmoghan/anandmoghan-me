#!/usr/bin/env node

/**
 * Test R2 Connection
 * 
 * Quick diagnostic script to test R2 credentials and connection
 * 
 * Usage:
 *   npm run test-r2
 */

import 'dotenv/config';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function testR2Connection() {
  console.log('🔍 Testing R2 Connection...\n');

  // Check environment variables
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || 'anandmoghan-media';

  console.log('Environment Variables:');
  console.log(`  CLOUDFLARE_ACCOUNT_ID: ${accountId ? '✅ Set' : '❌ Missing'}`);
  console.log(`  R2_ACCESS_KEY_ID: ${accessKeyId ? '✅ Set' : '❌ Missing'}`);
  console.log(`  R2_SECRET_ACCESS_KEY: ${secretAccessKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`  R2_BUCKET_NAME: ${bucketName}\n`);

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error('❌ Missing required environment variables!');
    console.error('\nMake sure your .env file contains:');
    console.error('  CLOUDFLARE_ACCOUNT_ID=your_account_id');
    console.error('  R2_ACCESS_KEY_ID=your_access_key');
    console.error('  R2_SECRET_ACCESS_KEY=your_secret_key');
    console.error('  R2_BUCKET_NAME=anandmoghan-media');
    process.exit(1);
  }

  // Initialize R2 client
  console.log('Initializing R2 client...');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  console.log('✅ R2 client initialized\n');

  // Test connection by listing objects
  try {
    console.log(`Listing objects in bucket: ${bucketName}`);
    console.log('Prefix: public/\n');

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'public/',
      MaxKeys: 10, // Limit to 10 for testing
    });

    const response = await client.send(command);

    console.log('✅ Successfully connected to R2!\n');
    console.log(`Found ${response.Contents?.length || 0} objects (showing first 10):\n`);

    if (response.Contents && response.Contents.length > 0) {
      response.Contents.forEach((object, index) => {
        const sizeKB = ((object.Size || 0) / 1024).toFixed(2);
        console.log(`  ${index + 1}. ${object.Key}`);
        console.log(`     Size: ${sizeKB} KB`);
        console.log(`     Last Modified: ${object.LastModified?.toISOString()}\n`);
      });
    } else {
      console.log('  No objects found with prefix "public/"');
      console.log('\n💡 Tip: Upload media using:');
      console.log('  npm run upload-media -- --source ~/photos --type public\n');
    }

    console.log('✅ R2 connection test passed!');
  } catch (error) {
    console.error('❌ Failed to connect to R2!\n');
    
    if (error instanceof Error) {
      console.error('Error:', error.message);
      
      if (error.message.includes('InvalidAccessKeyId')) {
        console.error('\n💡 Your R2_ACCESS_KEY_ID appears to be invalid.');
        console.error('   Check your Cloudflare R2 dashboard for the correct key.');
      } else if (error.message.includes('SignatureDoesNotMatch')) {
        console.error('\n💡 Your R2_SECRET_ACCESS_KEY appears to be invalid.');
        console.error('   Check your Cloudflare R2 dashboard for the correct secret.');
      } else if (error.message.includes('NoSuchBucket')) {
        console.error(`\n💡 Bucket "${bucketName}" does not exist.`);
        console.error('   Check your R2_BUCKET_NAME or create the bucket in Cloudflare.');
      } else {
        console.error('\nFull error:', error);
      }
    }
    
    process.exit(1);
  }
}

testR2Connection();
