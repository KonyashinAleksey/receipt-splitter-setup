# Обновление Nginx конфигурации

## Проблема
CORS заголовки дублируются (Nginx + Node.js), что вызывает ошибку:
```
The 'Access-Control-Allow-Origin' header contains multiple values
```

## Решение
Убрать CORS заголовки из Nginx, оставить только в Node.js.

---

## Шаги на сервере Timeweb:

### 1. Подключитесь к серверу:
```bash
ssh root@72.56.87.115
```

### 2. Обновите код из Git:
```bash
cd ~/receipt-splitter-setup
git pull origin main
```

### 3. Замените конфигурацию Nginx:
```bash
sudo cp nginx-receipt-proxy.conf /etc/nginx/sites-available/receipt-proxy
```

### 4. Проверьте конфигурацию:
```bash
sudo nginx -t
```

Должно быть:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Перезапустите Nginx:
```bash
sudo systemctl reload nginx
```

### 6. Проверьте работу:
```bash
curl -I https://api.testagentn8n.ru/health
```

Должно быть **ровно ОДИН** заголовок `Access-Control-Allow-Origin`.

---

## Готово! ✅

После этого Mini App должен заработать на всех устройствах БЕЗ VPN!
