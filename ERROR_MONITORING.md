# 🔍 Мониторинг ошибок Receipt Splitter

## 📡 Что логируется

### 1. Telegram Bot (bot.js)
- ❌ Ошибки polling
- ❌ Необработанные промисы
- ❌ Критические ошибки приложения
- 📊 Действия пользователей (уже есть)
- 📸 Загруженные чеки (уже есть)

### 2. Proxy Server (proxy-server.js)
- ❌ Ошибки API запросов
- ❌ Ошибки Supabase
- ❌ Необработанные промисы
- ❌ Критические ошибки сервера

### 3. Mini App (React)
- ❌ Ошибки рендеринга (ErrorBoundary)
- ❌ Необработанные промисы
- ❌ Глобальные JS ошибки
- 📱 Информация о пользователе и устройстве

---

## 📱 Куда приходят ошибки

Все ошибки отправляются в ваш **Telegram канал**:
```
ADMIN_CHANNEL_ID=-1003317071515
```

---

## 🚀 Как развернуть

### 1. Локально (для теста):
```bash
cd /Users/aleksey/Applications/cursor/Personal-Super-Agent/Docs/Projects/receipt-splitter-setup
npm install
```

### 2. На сервере Timeweb:
```bash
ssh root@72.56.87.115
cd ~/receipt-splitter-setup
git pull origin main

# Перезапустить бота
pm2 restart bot

# Перезапустить прокси
pm2 restart receipt-proxy
```

### 3. Mini App (Yandex Object Storage):
```bash
# Локально
cd miniapp
npm install
npm run build
cd ..
node scripts/yc-upload.js
```

Или используйте:
```bash
npm run deploy:miniapp
```

---

## 📊 Примеры сообщений об ошибках

### Бот:
```
🚨 Ошибка polling бота:
ETELEGRAM: 409 Conflict: terminated by other getUpdates request
```

### Прокси:
```
🚨 Ошибка Proxy Server:
POST /api/boards/123
Error: PGRST116: The result contains 0 rows
```

### Mini App:
```
🔴 Ошибка в Mini App
📱 Пользователь: Алексей (@username)
⚠️ Сообщение: TypeError: Cannot read property 'id' of undefined
📍 Контекст: React ErrorBoundary
🌐 URL: https://receipt-splitter-app.website.yandexcloud.net/board/123
```

---

## 🔧 Troubleshooting

### Ошибки не приходят в Telegram:
1. Проверьте `.env`:
   ```bash
   cat .env | grep ADMIN_CHANNEL_ID
   cat .env | grep TELEGRAM_BOT_TOKEN
   ```
2. Проверьте, что бот админ в канале
3. Перезапустите сервисы:
   ```bash
   pm2 restart all
   ```

### Слишком много логов:
- Отредактируйте условия логирования в коде
- Используйте фильтры в Telegram

---

## 📈 Дополнительно

Для более продвинутого мониторинга можно использовать:
- **Sentry** (sentry.io) - профессиональный трекинг ошибок
- **LogRocket** - запись сессий пользователей
- **Supabase Logs** - встроенные логи в Supabase Dashboard

Но для MVP текущее решение отлично работает! ✅
