require('dotenv').config();
const fs = require('fs');

console.log('Current directory:', process.cwd());
console.log('Files in directory:', fs.readdirSync('.'));

console.log('\n--- Environment Variables Loaded from .env ---');
const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TELEGRAM_BOT_TOKEN', 'OCR_ENGINE', 'OPENAI_API_KEY'];

keys.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`${key}: [Present, length: ${value.length}]`);
  } else {
    console.log(`${key}: [MISSING]`);
  }
});

console.log('\n--- All Env Keys starting with SUPA ---');
Object.keys(process.env).forEach(k => {
  if (k.startsWith('SUPA')) {
    console.log(`${k}: ${process.env[k] ? '[Present]' : '[Empty]'}`);
  }
});

