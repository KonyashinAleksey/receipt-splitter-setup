#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Скрипт отката изменений OCR парсера\n');

// Проверяем наличие резервной копии
const backupFile = 'ocr_backup_tesseract.js';
if (!fs.existsSync(backupFile)) {
  console.log('❌ Резервная копия не найдена!');
  console.log('   Файл:', backupFile);
  process.exit(1);
}

// Восстанавливаем резервную копию
try {
  fs.copyFileSync(backupFile, 'ocr.js');
  console.log('✅ Восстановлен Tesseract OCR парсер');
} catch (error) {
  console.log('❌ Ошибка при восстановлении:', error.message);
  process.exit(1);
}

// Восстанавливаем ocr_engine.js к исходному состоянию
const originalEngineContent = `const { recognizeReceipt: recognizeWithTesseract, parseReceiptText } = require('./ocr');
const { recognizeReceiptYandex } = require('./ocr_yandex');

async function recognizeReceipt(imagePath) {
  const engine = (process.env.OCR_ENGINE || 'tesseract').toLowerCase();
  if (engine === 'yandex') {
    return recognizeReceiptYandex(imagePath);
  }
  // default
  return recognizeWithTesseract(imagePath);
}

module.exports = { recognizeReceipt, parseReceiptText };
`;

try {
  fs.writeFileSync('ocr_engine.js', originalEngineContent);
  console.log('✅ Восстановлен ocr_engine.js к исходному состоянию');
} catch (error) {
  console.log('❌ Ошибка при восстановлении ocr_engine.js:', error.message);
  process.exit(1);
}

console.log('\n🎉 Откат завершен успешно!');
console.log('📋 Что было восстановлено:');
console.log('   - Tesseract OCR парсер (ocr.js)');
console.log('   - Переключатель OCR движков (ocr_engine.js)');
console.log('\n💡 Для использования Yandex OCR установите переменную окружения:');
console.log('   OCR_ENGINE=yandex');







