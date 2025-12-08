const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '.env');

console.log('Checking .env at:', envPath);

try {
  if (fs.existsSync(envPath)) {
    console.log('File exists.');
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('Content length:', content.length);
    console.log('First 50 chars:', content.substring(0, 50).replace(/\n/g, '\\n'));
    
    const parsed = dotenv.parse(content);
    console.log('Parsed keys:', Object.keys(parsed));
    console.log('SUPABASE_URL value:', parsed.SUPABASE_URL ? 'Present' : 'Missing');
  } else {
    console.log('File does NOT exist.');
  }
} catch (e) {
  console.error('Error reading .env:', e);
}

