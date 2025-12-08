const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
console.log('Reading .env from:', envPath);

try {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('File content length:', content.length);
  
  content.split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      console.log(`Line ${index + 1}: Key found -> "${key}"`);
    }
  });

} catch (err) {
  console.error('Error reading .env:', err.message);
}

