#!/usr/bin/env node

// Upload Mini App build to Yandex Object Storage (S3-compatible)
// Requirements:
// - npm i -D @aws-sdk/client-s3 mime
// - env vars set: YC_S3_ENDPOINT, YC_S3_REGION, YC_S3_BUCKET, YC_S3_ACCESS_KEY_ID, YC_S3_SECRET_ACCESS_KEY

const fs = require('fs');
const path = require('path');

// Ensure .env is loaded from root
const ROOT = path.resolve(__dirname, '..');
// Try loading yandex.config.env first, fallback to .env
const yandexEnvPath = path.join(ROOT, 'yandex.config.env');
if (fs.existsSync(yandexEnvPath)) {
    console.log('📄 Loading config from yandex.config.env');
    require('dotenv').config({ path: yandexEnvPath });
} else {
    console.log('📄 Loading config from .env');
    require('dotenv').config({ path: path.join(ROOT, '.env') });
}

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mimeTypes = require('mime-types');

const BUILD_DIR = path.join(ROOT, 'miniapp', 'build');

const {
  YC_S3_ENDPOINT,
  YC_S3_REGION = 'ru-central1',
  YC_S3_BUCKET,
  YC_S3_ACCESS_KEY_ID,
  YC_S3_SECRET_ACCESS_KEY,
} = process.env;

if (!YC_S3_ENDPOINT || !YC_S3_BUCKET || !YC_S3_ACCESS_KEY_ID || !YC_S3_SECRET_ACCESS_KEY) {
  console.error('❌ Missing Yandex S3 environment variables. Please set YC_S3_ENDPOINT, YC_S3_BUCKET, YC_S3_ACCESS_KEY_ID, YC_S3_SECRET_ACCESS_KEY');
  process.exit(1);
}

if (!fs.existsSync(BUILD_DIR)) {
  console.error(`❌ Build directory not found: ${BUILD_DIR}. Run: cd miniapp && npm run build`);
  process.exit(1);
}

const s3 = new S3Client({
  region: YC_S3_REGION,
  endpoint: YC_S3_ENDPOINT,
  credentials: {
    accessKeyId: YC_S3_ACCESS_KEY_ID,
    secretAccessKey: YC_S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

function listFilesRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFilesRecursive(full));
    else files.push(full);
  }
  return files;
}

function toKey(absPath) {
  return path.relative(BUILD_DIR, absPath).replace(/\\/g, '/');
}

async function putObject(filePath) {
  const key = toKey(filePath);
  const body = fs.readFileSync(filePath);
  const contentType = mimeTypes.lookup(filePath) || 'application/octet-stream';

  // Cache policy: long cache for hashed assets, no-store for HTML
  const isHtml = key.endsWith('.html');
  const isManifest = key.endsWith('asset-manifest.json') || key.endsWith('manifest.json');
  const isHashedAsset = /(\.[a-f0-9]{8,}\.)/.test(key);

  let cacheControl = undefined;
  if (isHtml) cacheControl = 'no-store';
  else if (isManifest) cacheControl = 'no-cache';
  else if (isHashedAsset) cacheControl = 'public, max-age=31536000, immutable';
  else cacheControl = 'public, max-age=3600';

  const cmd = new PutObjectCommand({
    Bucket: YC_S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
    ACL: 'public-read',
  });

  await s3.send(cmd);
  console.log(`✅ Uploaded: ${key} (${contentType})`);
}

async function main() {
  console.log('🚀 Uploading Mini App build to Yandex Object Storage...');
  const files = listFilesRecursive(BUILD_DIR);
  for (const file of files) {
    await putObject(file);
  }
  console.log('🎉 Done. Ensure your bucket has a public-read policy or CDN enabled.');
  console.log('ℹ️ If using Static website hosting, set Index: index.html, Error: index.html');
}

main().catch((err) => {
  console.error('❌ Upload failed:', err?.message || err);
  process.exit(1);
});


