// start-proxy.js
// Простой запуск прокси с явной загрузкой переменных

const path = require('path');
const fs = require('fs');

// Проверяем наличие .env
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Файл .env не найден!');
  process.exit(1);
}

// Загружаем .env
const result = require('dotenv').config({ path: envPath });
if (result.error) {
  console.error('❌ Ошибка загрузки .env:', result.error);
  process.exit(1);
}

console.log('✅ .env загружен успешно');
console.log('📋 Переменные:');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '✗');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
console.log('  PROXY_PORT:', process.env.PROXY_PORT || '3001 (default)');

// Запускаем прокси
console.log('\n🚀 Запускаю proxy-server...\n');
require('./proxy-server.js');
