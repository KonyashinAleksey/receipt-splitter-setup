#!/bin/bash
# Скрипт для развертывания системы мониторинга ошибок

echo "🚀 Развертывание мониторинга ошибок..."

# На сервере Timeweb
ssh root@72.56.87.115 << 'EOF'
  cd ~/receipt-splitter-setup
  
  echo "📥 Обновляем код..."
  git pull origin main
  
  echo "📦 Устанавливаем зависимости..."
  npm install
  
  echo "🔄 Перезапускаем бота..."
  pm2 restart bot
  
  echo "🔄 Перезапускаем прокси..."
  pm2 restart receipt-proxy
  
  echo "✅ Сервер обновлен!"
  
  pm2 status
EOF

echo ""
echo "🌐 Собираем и деплоим Mini App..."
cd miniapp
npm install
npm run build
cd ..
node scripts/yc-upload.js

echo ""
echo "✅ Развертывание завершено!"
echo "📱 Все ошибки будут приходить в ваш Telegram канал"
