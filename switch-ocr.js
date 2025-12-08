const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ENV_PATH = path.join(ROOT, '.env');

/**
 * Скрипт для переключения между OCR движками
 * Использование: node switch-ocr.js [yandex|gpt|tesseract]
 */

async function switchOCR(engine) {
  console.log(`🔄 Переключаем OCR движок на: ${engine.toUpperCase()}`);
  
  try {
    // Читаем текущий .env файл
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf8');
    }
    
    // Обновляем или добавляем OCR_ENGINE
    const lines = envContent.split('\n');
    let found = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('OCR_ENGINE=')) {
        lines[i] = `OCR_ENGINE=${engine}`;
        found = true;
        break;
      }
    }
    
    if (!found) {
      lines.push(`OCR_ENGINE=${engine}`);
    }
    
    // Записываем обновленный .env
    fs.writeFileSync(ENV_PATH, lines.join('\n'));
    
    console.log(`✅ OCR движок переключен на: ${engine.toUpperCase()}`);
    console.log(`📝 Обновлен файл: ${ENV_PATH}`);
    
    // Показываем текущую конфигурацию
    console.log('\n📋 Текущая конфигурация OCR:');
    console.log(`   OCR_ENGINE=${engine}`);
    
    if (engine === 'gpt') {
      console.log('\n🤖 GPT Vision настройки:');
      console.log('   - Требуется OPENAI_API_KEY в .env');
      console.log('   - Использует модель gpt-4o');
      console.log('   - Возвращает структурированный JSON');
    } else if (engine === 'yandex') {
      console.log('\n🔍 Yandex Vision настройки:');
      console.log('   - Требуется YANDEX_VISION_API_KEY в .env');
      console.log('   - Использует Yandex Cloud Vision API');
      console.log('   - Парсинг через регулярные выражения');
    } else {
      console.log('\n📖 Tesseract настройки:');
      console.log('   - Локальная обработка');
      console.log('   - Не требует API ключей');
      console.log('   - Парсинг через регулярные выражения');
    }
    
    console.log('\n🚀 Для применения изменений перезапустите бота:');
    console.log('   pkill -f "node bot.js" && node bot.js');
    
  } catch (error) {
    console.error('❌ Ошибка при переключении OCR:', error.message);
    process.exit(1);
  }
}

// Получаем аргумент командной строки
const engine = process.argv[2];

if (!engine || !['yandex', 'gpt', 'tesseract'].includes(engine.toLowerCase())) {
  console.log('🔄 Переключатель OCR движков');
  console.log('\nИспользование:');
  console.log('  node switch-ocr.js yandex  - переключить на Yandex Vision');
  console.log('  node switch-ocr.js gpt     - переключить на GPT Vision');
  console.log('  node switch-ocr.js tesseract - переключить на Tesseract');
  console.log('\nТекущая конфигурация:');
  
  try {
    if (fs.existsSync(ENV_PATH)) {
      const envContent = fs.readFileSync(ENV_PATH, 'utf8');
      const ocrLine = envContent.split('\n').find(line => line.startsWith('OCR_ENGINE='));
      if (ocrLine) {
        console.log(`   ${ocrLine}`);
      } else {
        console.log('   OCR_ENGINE не установлен (по умолчанию: yandex)');
      }
    } else {
      console.log('   .env файл не найден');
    }
  } catch (error) {
    console.log('   Ошибка чтения конфигурации');
  }
  
  process.exit(0);
}

switchOCR(engine.toLowerCase());


