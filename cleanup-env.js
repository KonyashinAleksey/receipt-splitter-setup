const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
let content = fs.readFileSync(envPath, 'utf8');

// Удаляем первое вхождение (или все старые)
content = content.replace(/^OCR_ENGINE=yandex\s*$/m, '');
content = content.replace(/^OCR_ENGINE=tesseract\s*$/m, '');
// Удаляем дубликаты пустых строк
content = content.replace(/\n\s*\n/g, '\n');

// Убеждаемся что в конце есть gemini
if (!content.includes('OCR_ENGINE=gemini')) {
    content += '\nOCR_ENGINE=gemini\n';
}

fs.writeFileSync(envPath, content);
console.log('Fixed .env: removed duplicate OCR_ENGINE');

