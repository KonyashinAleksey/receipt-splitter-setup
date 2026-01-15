# 🚀 Инструкции по настройке Proxy Server

## ✅ Что уже сделано:

1. ✅ Создан `proxy-server.js` - прокси-сервер для обхода блокировок
2. ✅ Создан `miniapp/src/lib/proxy-client.ts` - клиент для Mini App
3. ✅ Обновлены импорты в `App.tsx` и `JoinPage.tsx`

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ:

### ШАГ 1: Установить зависимости

```bash
cd /Users/aleksey/Applications/cursor/Personal-Super-Agent/Docs/Projects/receipt-splitter-setup
npm install express cors
```

---

### ШАГ 2: Добавить переменную в `.env`

Откройте файл `.env` и добавьте в конец:

```env
# Proxy Server
PROXY_PORT=3001
```

Сохраните файл.

---

### ШАГ 3: Создать `.env.production` в папке `miniapp/`

```bash
cd miniapp
nano .env.production
```

Вставьте следующее содержимое:

```env
# Для локального тестирования используйте localhost
# После деплоя на Timeweb замените на IP сервера
REACT_APP_PROXY_URL=http://localhost:3001

# Для продакшена (замените на ваш IP Timeweb):
# REACT_APP_PROXY_URL=http://185.104.xxx.xxx:3001
```

Сохраните (`Ctrl + X`, `Y`, `Enter`).

---

### ШАГ 4: Тестирование локально

#### 4.1. Запустите прокси-сервер

В одном терминале:

```bash
cd /Users/aleksey/Applications/cursor/Personal-Super-Agent/Docs/Projects/receipt-splitter-setup
node proxy-server.js
```

Вы должны увидеть:

```
🚀 Proxy server running on http://0.0.0.0:3001
📡 Supabase URL: https://lhrgysrrakswjajwlnsw.supabase.co
🔐 Using SERVICE_ROLE_KEY for auth bypass
🌐 CORS enabled for Yandex Cloud domains
```

#### 4.2. Проверьте health check

В другом терминале:

```bash
curl http://localhost:3001/health
```

Должно вернуть:

```json
{"status":"ok","timestamp":"2026-01-15T...","supabase_url":"https://..."}
```

#### 4.3. Запустите Mini App локально

В третьем терминале:

```bash
cd miniapp
npm start
```

Откройте http://localhost:3000 и проверьте, что доски загружаются.

---

### ШАГ 5: Деплой на Timeweb

#### 5.1. Подключитесь к Timeweb

```bash
ssh root@ваш-ip-timeweb
```

#### 5.2. Перейдите в папку проекта

```bash
cd /root/receipt-splitter-setup
# Или куда вы установили проект
```

#### 5.3. Обновите код

```bash
git pull origin main
```

Или скопируйте файл `proxy-server.js` вручную:

```bash
# На вашем компьютере:
scp proxy-server.js root@ваш-ip-timeweb:/root/receipt-splitter-setup/

# На сервере Timeweb:
cd /root/receipt-splitter-setup
```

#### 5.4. Установите зависимости

```bash
npm install express cors
```

#### 5.5. Добавьте `PROXY_PORT=3001` в `.env` на сервере

```bash
nano .env
```

Добавьте в конец:

```env
PROXY_PORT=3001
```

Сохраните (`Ctrl + X`, `Y`, `Enter`).

#### 5.6. Запустите прокси через PM2

```bash
pm2 start proxy-server.js --name "receipt-proxy"
pm2 save
```

#### 5.7. Проверьте статус

```bash
pm2 status
```

Вы должны увидеть:

```
┌─────┬─────────────────┬─────────┬─────────┬────────┐
│ id  │ name            │ status  │ restart │ uptime │
├─────┼─────────────────┼─────────┼─────────┼────────┤
│ 0   │ bot             │ online  │ 0       │ Xh     │
│ 1   │ receipt-proxy   │ online  │ 0       │ 0s     │
└─────┴─────────────────┴─────────┴─────────┴────────┘
```

#### 5.8. Откройте порт 3001 в файерволе

```bash
sudo ufw allow 3001/tcp
sudo ufw reload
```

#### 5.9. Проверьте доступность извне

На вашем компьютере:

```bash
curl http://ваш-ip-timeweb:3001/health
```

Должно вернуть JSON с `{"status":"ok",...}`.

---

### ШАГ 6: Обновить Mini App для продакшена

#### 6.1. Узнайте IP Timeweb

```bash
# На сервере Timeweb:
curl ifconfig.me
```

Запишите IP (например: `185.104.123.45`).

#### 6.2. Обновите `miniapp/.env.production`

На вашем компьютере:

```bash
cd miniapp
nano .env.production
```

Замените содержимое на:

```env
REACT_APP_PROXY_URL=http://185.104.123.45:3001
```

(Замените `185.104.123.45` на ваш реальный IP Timeweb)

Сохраните файл.

#### 6.3. Соберите и задеплойте Mini App

```bash
cd /Users/aleksey/Applications/cursor/Personal-Super-Agent/Docs/Projects/receipt-splitter-setup
cd miniapp
npm run build
cd ..
npm run deploy:miniapp
```

---

### ШАГ 7: Тестирование на iOS

1. Откройте бота в Telegram на iPhone (БЕЗ VPN).
2. Загрузите фото чека.
3. Бот пришлет ссылку на доску.
4. Откройте доску.
5. **Попробуйте выбрать позицию** - должно работать без ошибок!

---

## 🛠 Отладка

### Просмотр логов прокси на Timeweb:

```bash
pm2 logs receipt-proxy
```

Вы должны видеть запросы:

```
[2026-01-15T...] 📥 GET /api/boards/abc-123
[2026-01-15T...] 📥 POST /api/item-selections
```

### Если ошибка "Failed to fetch" или CORS:

Проверьте, что в `proxy-server.js` в CORS origins указаны правильные домены:

```javascript
origin: [
  'https://receipt-splitter-app.storage.yandexcloud.net',
  'https://receipt-splitter-app.website.yandexcloud.net',
  'http://localhost:3000'
]
```

Перезапустите прокси:

```bash
pm2 restart receipt-proxy
```

---

## 📊 Что проверить после деплоя:

- ✅ Прокси работает: `curl http://ip:3001/health`
- ✅ Порт 3001 открыт в файерволе
- ✅ Mini App собран с правильным `REACT_APP_PROXY_URL`
- ✅ Mini App задеплоен на Yandex Cloud
- ✅ iOS может выбирать позиции без VPN

---

## 🎯 Следующие шаги (опционально):

### Настроить HTTPS через NGINX

Если iOS всё ещё медленный из-за HTTP, можно настроить NGINX с SSL:

1. Установите NGINX и Certbot
2. Настройте reverse proxy для порта 3001
3. Получите SSL-сертификат
4. Измените `REACT_APP_PROXY_URL` на `https://...`

Инструкции есть в основном README.

---

Удачи! 🚀
