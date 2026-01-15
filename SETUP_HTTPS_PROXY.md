# 🔐 Настройка HTTPS для прокси на Timeweb

## Подключитесь к серверу

```bash
ssh root@72.56.87.115
```

---

## Шаг 1: Установите Nginx и Certbot

```bash
# Обновляем пакеты
apt update

# Устанавливаем Nginx
apt install -y nginx

# Устанавливаем Certbot для Let's Encrypt
apt install -y certbot python3-certbot-nginx
```

---

## Шаг 2: Настройте Nginx как reverse proxy

```bash
# Создаем конфигурацию для прокси
cat > /etc/nginx/sites-available/receipt-proxy << 'EOF'
server {
    listen 80;
    server_name api.testagentn8n.ru;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'authorization, x-client-info, apikey, content-type' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
EOF

# Активируем конфигурацию
ln -sf /etc/nginx/sites-available/receipt-proxy /etc/nginx/sites-enabled/

# Проверяем конфигурацию
nginx -t

# Перезапускаем Nginx
systemctl restart nginx
```

---

## Шаг 3: Получите SSL сертификат от Let's Encrypt

```bash
# Получаем сертификат (автоматически настроит HTTPS)
certbot --nginx -d api.testagentn8n.ru --non-interactive --agree-tos --email ваш-email@example.com
```

**⚠️ Замените `ваш-email@example.com` на ваш реальный email!**

---

## Шаг 4: Проверьте что всё работает

```bash
# Проверяем HTTPS
curl https://api.testagentn8n.ru/health
```

Должно вернуть:
```json
{"status":"ok","timestamp":"...","supabase_url":"..."}
```

---

## Шаг 5: Настройте автообновление сертификата

```bash
# Certbot автоматически настроит cron для обновления
# Проверим что таймер работает:
systemctl status certbot.timer
```

---

## ✅ Готово!

Теперь прокси доступен по адресу:
```
https://api.testagentn8n.ru
```

Переходите к обновлению Mini App!
