# 🔐 Настройка GitHub Authentication для Push

## Проблема
После клонирования репозитория `git push` выдает ошибку:
```
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed
```

## Решение: Personal Access Token (PAT)

### Шаг 1: Создайте Personal Access Token

1. Откройте: **https://github.com/settings/tokens**
2. Нажмите **"Generate new token"** → **"Generate new token (classic)"**
3. Настройте токен:
   - **Note:** `receipt-splitter-mac` (название для памяти)
   - **Expiration:** `No expiration` (или `90 days`)
   - **Scopes:** ✅ **`repo`** (полный доступ к репозиториям)
4. Нажмите **"Generate token"**
5. **СКОПИРУЙТЕ токен!** (показывается только один раз)
   - Формат: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Шаг 2: Сохраните токен в macOS Keychain

Откройте Терминал и выполните:

```bash
cd /Users/aleksey/Applications/cursor/Personal-Super-Agent/Docs/Projects/receipt-splitter-setup

# Сохранить токен в macOS Keychain
echo "protocol=https
host=github.com
username=KonyashinAleksey
password=ВАШ_ТОКЕН" | git credential-osxkeychain store
```

**Замените `ВАШ_ТОКЕН`** на реальный токен (ghp_...)

### Шаг 3: Проверьте push

```bash
git push origin main
```

Если всё настроено правильно, вы увидите:
```
Enumerating objects: X, done.
Writing objects: 100% (X/X), done.
To https://github.com/KonyashinAleksey/receipt-splitter-setup.git
   xxx..xxx  main -> main
```

✅ **Готово!** Токен сохранен, теперь `git push` будет работать автоматически.

---

## Альтернатива: Использование SSH

Если не хотите возиться с токенами, настройте SSH:

### 1. Создайте SSH ключ

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Нажмите Enter (сохранить в ~/.ssh/id_ed25519)
# Нажмите Enter (без пароля, если хотите)
```

### 2. Добавьте ключ в ssh-agent

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### 3. Скопируйте публичный ключ

```bash
cat ~/.ssh/id_ed25519.pub
```

### 4. Добавьте в GitHub

1. Откройте: **https://github.com/settings/keys**
2. Нажмите **"New SSH key"**
3. Вставьте содержимое из шага 3
4. Сохраните

### 5. Переключите remote на SSH

```bash
cd /Users/aleksey/Applications/cursor/Personal-Super-Agent/Docs/Projects/receipt-splitter-setup
git remote set-url origin git@github.com:KonyashinAleksey/receipt-splitter-setup.git
```

Теперь `git push` будет работать через SSH без токенов.

---

## Решение проблем

### Ошибка: "Invalid username or token"
- Токен истек или неправильный
- Создайте новый токен и повторите Шаг 2

### Ошибка: "Permission denied (publickey)" (при SSH)
- SSH ключ не добавлен в GitHub
- Повторите шаги настройки SSH

### Проверка сохраненного токена в Keychain

```bash
git credential-osxkeychain get <<EOF
protocol=https
host=github.com
EOF
```

Должно вернуть:
```
protocol=https
host=github.com
username=KonyashinAleksey
password=ghp_...
```

---

## Полезные команды

```bash
# Удалить сохраненный токен из Keychain
git credential-osxkeychain erase <<EOF
protocol=https
host=github.com
EOF

# Проверить remote URL
git remote -v

# Изменить remote URL
git remote set-url origin https://github.com/KonyashinAleksey/receipt-splitter-setup.git
```

---

✅ **Готово!** Теперь вы можете свободно делать `git push` без проблем с аутентификацией.
