const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '.env');
console.log('Loading .env from:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('.env loaded successfully');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
}

