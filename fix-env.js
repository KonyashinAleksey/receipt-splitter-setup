const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const content = fs.readFileSync(envPath, 'utf8');

if (!content.includes('OCR_ENGINE=gemini')) {
  console.log('Appending OCR_ENGINE=gemini to .env');
  fs.appendFileSync(envPath, '\nOCR_ENGINE=gemini\n');
} else {
  console.log('OCR_ENGINE=gemini already exists, updating it if needed');
  // Simple regex replace to ensure it's set to gemini if it was something else
  const newContent = content.replace(/OCR_ENGINE=.*/g, 'OCR_ENGINE=gemini');
  fs.writeFileSync(envPath, newContent);
}

// Also check GEMINI_API_KEY
if (!content.includes('GEMINI_API_KEY=')) {
     console.log('Warning: GEMINI_API_KEY is missing in .env');
}

