require('dotenv').config();

const vars = [
  'YC_S3_ENDPOINT',
  'YC_S3_BUCKET',
  'YC_S3_ACCESS_KEY_ID',
  'YC_S3_SECRET_ACCESS_KEY'
];

console.log('--- YC S3 Env Check ---');
vars.forEach(v => {
  console.log(`${v}: ${process.env[v] ? 'Present' : 'Missing'}`);
});

