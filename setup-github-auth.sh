#!/bin/bash
# Скрипт для настройки GitHub authentication

echo "🔐 Настройка GitHub Authentication"
echo ""
echo "Шаг 1: Создайте Personal Access Token на GitHub:"
echo "  https://github.com/settings/tokens"
echo ""
echo "Шаг 2: Введите ваш токен (ghp_...)"
read -sp "GitHub Token: " GITHUB_TOKEN
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Токен не введен!"
  exit 1
fi

echo ""
echo "📝 Настраиваю git credentials..."

# Сохраняем в keychain
echo "protocol=https
host=github.com
username=KonyashinAleksey
password=$GITHUB_TOKEN" | git credential-osxkeychain store

echo "✅ Токен сохранен в macOS Keychain!"
echo ""
echo "🧪 Проверяю подключение к GitHub..."

cd /Users/aleksey/Applications/cursor/Personal-Super-Agent/Docs/Projects/receipt-splitter-setup
git push origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "🎉 Успешно! GitHub настроен."
else
  echo ""
  echo "❌ Ошибка push. Проверьте токен."
fi
