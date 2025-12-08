const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
console.log('--- .env content ---');
console.log(fs.readFileSync(envPath, 'utf8'));
console.log('--- end ---');

