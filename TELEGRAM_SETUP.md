# 🚀 Развертывание Mini App в Telegram

Пошаговая инструкция по настройке и развертыванию Mini App в Telegram.

## 📋 Предварительные требования

- [x] Node.js 16+ установлен
- [x] Git установлен
- [x] Аккаунт в Supabase
- [x] Аккаунт в Vercel/Netlify
- [x] Telegram аккаунт

## 🔧 Шаг 1: Создание Telegram бота

### 1.1 Создание бота через BotFather

1. Откройте [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Введите имя бота: `Receipt Splitter Bot`
4. Введите username: `your_bot_username` (должен заканчиваться на `_bot`)
5. **Сохраните токен бота** - он понадобится для настройки

### 1.2 Настройка команд бота

```
/setcommands
@your_bot_username
start - Запустить бота и открыть Mini App
help - Получить помощь по использованию
```

### 1.3 Настройка описания бота

```
/setdescription
@your_bot_username
Бот для разделения счетов с OCR распознаванием чеков. Загрузите фото чека и получите ссылку для разделения счета между участниками.
```

## 🗄️ Шаг 2: Настройка базы данных Supabase

### 2.1 Создание проекта

1. Перейдите на [supabase.com](https://supabase.com)
2. Нажмите "New Project"
3. Выберите организацию и введите название проекта
4. Создайте пароль для базы данных
5. Выберите регион (ближайший к вам)

### 2.2 Настройка таблиц

Перейдите в SQL Editor и выполните следующие запросы:

```sql
-- Включение расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создание таблицы профилей
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы досок
CREATE TABLE boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES profiles(id),
  restaurant_name TEXT,
  address TEXT,
  total_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы участников
CREATE TABLE participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  is_creator BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы позиций чека
CREATE TABLE bill_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  emoji TEXT DEFAULT '🍽️',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы выборов участников
CREATE TABLE item_selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  item_id UUID REFERENCES bill_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_id, item_id)
);

-- Включение RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_selections ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Boards are viewable by everyone" ON boards FOR SELECT USING (true);
CREATE POLICY "Users can insert boards" ON boards FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update boards" ON boards FOR UPDATE USING (true);

CREATE POLICY "Participants are viewable by everyone" ON participants FOR SELECT USING (true);
CREATE POLICY "Users can insert participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update participants" ON participants FOR UPDATE USING (true);

CREATE POLICY "Bill items are viewable by everyone" ON bill_items FOR SELECT USING (true);
CREATE POLICY "Users can insert bill items" ON bill_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update bill items" ON bill_items FOR UPDATE USING (true);

CREATE POLICY "Item selections are viewable by everyone" ON item_selections FOR SELECT USING (true);
CREATE POLICY "Users can insert item selections" ON item_selections FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update item selections" ON item_selections FOR UPDATE USING (true);
CREATE POLICY "Users can delete item selections" ON item_selections FOR DELETE USING (true);
```

### 2.3 Получение ключей API

1. Перейдите в Settings → API
2. Скопируйте:
   - **Project URL** (SUPABASE_URL)
   - **anon public** ключ (SUPABASE_ANON_KEY)

## 🌐 Шаг 3: Развертывание Mini App

### 3.1 Подготовка проекта

```bash
# Клонирование репозитория
git clone <your-repository-url>
cd receipt-splitter-setup

# Установка зависимостей
npm install
cd miniapp
npm install
cd ..
```

### 3.2 Настройка переменных окружения

Создайте файл `.env`:

```bash
cp env.example .env
```

Заполните переменные:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
MINIAPP_URL=https://your-miniapp.vercel.app

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OCR (опционально)
OCR_ENGINE=tesseract
YANDEX_FOLDER_ID=your_folder_id
YANDEX_API_KEY=your_api_key
```

### 3.3 Развертывание на Vercel

```bash
# Установка Vercel CLI
npm install -g vercel

# Вход в аккаунт
vercel login

# Развертывание Mini App
cd miniapp
vercel --prod

# Получите URL (например: https://your-miniapp.vercel.app)
```

### 3.4 Альтернатива: Развертывание на Netlify

```bash
# Установка Netlify CLI
npm install -g netlify-cli

# Сборка проекта
cd miniapp
npm run build

# Развертывание
netlify deploy --prod --dir=build

# Получите URL
```

## 🔗 Шаг 4: Настройка Mini App в Telegram

### 4.1 Настройка кнопки меню

```
/setmenubutton
@your_bot_username
Открыть Mini App
https://your-miniapp.vercel.app
```

### 4.2 Настройка команд

```
/setcommands
@your_bot_username
start - Запустить бота и открыть Mini App
help - Получить помощь по использованию
```

### 4.3 Настройка описания

```
/setdescription
@your_bot_username
Бот для разделения счетов с OCR распознаванием чеков. Загрузите фото чека и получите ссылку для разделения счета между участниками.
```

## 🚀 Шаг 5: Запуск бота

### 5.1 Локальный запуск (для тестирования)

```bash
# Запуск Mini App
cd miniapp
npm start

# В другом терминале - запуск бота
cd ..
MINIAPP_URL=http://localhost:3000 node bot.js
```

### 5.2 Продакшен запуск

```bash
# Запуск бота
node bot.js

# Или с PM2 для автозапуска
npm install -g pm2
pm2 start bot.js --name "receipt-splitter-bot"
pm2 save
pm2 startup
```

## ✅ Шаг 6: Тестирование

### 6.1 Проверка бота

1. Найдите вашего бота в Telegram по username
2. Отправьте команду `/start`
3. Проверьте, что открывается Mini App

### 6.2 Тестирование OCR

1. Найдите фото чека (или используйте тестовое)
2. Отправьте фото боту
3. Проверьте, что создается доска с позициями
4. Откройте Mini App и проверьте функциональность

### 6.3 Проверка базы данных

```bash
# Тест подключения к Supabase
node test-supabase.js

# Тест загрузки доски
node test-board-load.js
```

## 🔧 Устранение проблем

### Проблема: Mini App не открывается

**Решение:**
1. Проверьте, что URL в `MINIAPP_URL` правильный
2. Убедитесь, что Mini App развернут и доступен
3. Проверьте, что кнопка меню настроена правильно

### Проблема: Ошибки базы данных

**Решение:**
1. Проверьте правильность SUPABASE_URL и SUPABASE_ANON_KEY
2. Убедитесь, что все таблицы созданы
3. Проверьте RLS политики

### Проблема: OCR не работает

**Решение:**
1. Проверьте качество фото чека
2. Убедитесь, что чек читаемый
3. Попробуйте другой чек

### Проблема: Бот не отвечает

**Решение:**
1. Проверьте, что токен бота правильный
2. Убедитесь, что бот запущен
3. Проверьте логи в терминале

## 📱 Готово!

Теперь ваш бот готов к использованию:

1. **Пользователи** отправляют фото чеков
2. **Бот** распознает текст и создает доски
3. **Mini App** позволяет управлять досками и выбирать позиции
4. **Автоматический расчет** долей каждого участника

## 🔄 Обновления

Для обновления Mini App:

```bash
cd miniapp
npm run build
vercel --prod
```

Для обновления бота:

```bash
# Остановите бота (Ctrl+C)
# Обновите код
node bot.js
```

---

**Удачного использования!** 🎉







