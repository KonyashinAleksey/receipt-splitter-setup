// proxy-server.js
// API-прокси для обхода блокировок Supabase на территории РФ

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// Telegram Bot для логирования ошибок
const bot = process.env.TELEGRAM_BOT_TOKEN 
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN)
  : null;
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;

// Функция логирования ошибок в Telegram
async function logErrorToTelegram(errorText) {
  if (!bot || !ADMIN_CHANNEL_ID) return;
  
  try {
    await bot.sendMessage(ADMIN_CHANNEL_ID, `🚨 <b>Ошибка Proxy Server:</b>\n${errorText}`, { 
      parse_mode: 'HTML' 
    });
  } catch (e) {
    console.error('Не удалось отправить лог в Telegram:', e.message);
  }
}

// Supabase клиент (серверная сторона)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Используем SERVICE_ROLE для обхода RLS
);

// CORS - разрешаем запросы только с вашего Mini App
app.use(cors({
  origin: [
    'https://receipt-splitter-app.storage.yandexcloud.net',
    'https://receipt-splitter-app.website.yandexcloud.net',
    'http://localhost:3000' // Для локальной разработки
  ],
  credentials: true
}));

app.use(express.json());

// Middleware для логирования запросов
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log(`\n[${timestamp}] 📥 ${req.method} ${req.path}`);
  console.log(`   IP: ${ip}`);
  console.log(`   User-Agent: ${req.headers['user-agent']?.slice(0, 80)}`);
  console.log(`   Origin: ${req.headers['origin'] || 'none'}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`   Body:`, JSON.stringify(req.body).slice(0, 150));
  }
  
  // Логируем ответ
  const originalSend = res.json;
  res.json = function(data) {
    console.log(`   ✅ Response ${res.statusCode}:`, JSON.stringify(data).slice(0, 200));
    originalSend.call(this, data);
  };
  
  next();
});

// ===== ЭНДПОИНТЫ ДЛЯ ДОСОК =====

// Получить доску по ID
app.get('/api/boards/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params;
    
    const { data, error } = await supabase
      .from('boards')
      .select(`
        *,
        restaurant:restaurants(*),
        participants(
          *,
          profile:profiles(*)
        ),
        bill_items(*)
      `)
      .eq('id', boardId)
      .single();

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    console.error('❌ Error fetching board:', err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// Получить выборы позиций для доски
app.get('/api/boards/:boardId/selections', async (req, res) => {
  try {
    const { boardId } = req.params;
    
    const { data, error } = await supabase
      .from('item_selections')
      .select(`
        *,
        item:bill_items(*),
        participant:participants(
          *,
          profile:profiles(*)
        )
      `)
      .eq('board_id', boardId);

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    console.error('❌ Error fetching selections:', err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ===== ЭНДПОИНТЫ ДЛЯ ВЫБОРОВ ПОЗИЦИЙ =====

// Создать выбор позиции (upsert)
app.post('/api/item-selections', async (req, res) => {
  try {
    const { item_id, participant_id, board_id } = req.body;
    
    const { data, error } = await supabase
      .from('item_selections')
      .upsert({
        item_id,
        participant_id,
        board_id
      }, {
        onConflict: 'item_id,participant_id'
      })
      .select(`
        *,
        item:bill_items(*),
        participant:participants(*, profile:profiles(*))
      `)
      .single();

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    console.error('❌ Error creating selection:', err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// Удалить выбор позиции
app.delete('/api/item-selections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('item_selections')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ data: null, error: null });
  } catch (err) {
    console.error('❌ Error deleting selection:', err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// Обновить выбор позиции (например, quantity)
app.patch('/api/item-selections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('item_selections')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        item:bill_items(*),
        participant:participants(*, profile:profiles(*))
      `)
      .single();

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    console.error('❌ Error updating selection:', err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ===== ЭНДПОИНТЫ ДЛЯ УЧАСТНИКОВ =====

// Добавить участника
app.post('/api/participants', async (req, res) => {
  try {
    const { boardId, profile } = req.body;
    
    // Создаем или получаем профиль
    let profileId;
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', profile.telegram_id)
      .single();

    if (existingProfile) {
      profileId = existingProfile.id;
    } else {
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          telegram_id: profile.telegram_id,
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name
        })
        .select()
        .single();
      
      if (profileError) throw profileError;
      profileId = newProfile.id;
    }

    // Добавляем участника
    const { data, error } = await supabase
      .from('participants')
      .insert({
        board_id: boardId,
        profile_id: profileId,
        name: profile.first_name || 'Участник',
        is_creator: false,
        total_amount: 0
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    console.error('❌ Error adding participant:', err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ===== ЭНДПОИНТЫ ДЛЯ РЕДАКТИРОВАНИЯ =====

// Обновить доску (через RPC)
app.patch('/api/boards/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { updates, telegramId } = req.body;
    
    if (telegramId) {
      // Используем RPC для безопасного обновления
      const { data, error } = await supabase.rpc('update_board_safe', {
        p_board_id: boardId,
        p_telegram_id: telegramId,
        p_restaurant_name: updates.restaurant_name || '',
        p_address: updates.address || '',
        p_total_amount: updates.total_amount || 0
      });
      
      if (error) throw error;
      res.json({ data, error: null });
    } else {
      // Обычное обновление
      const { data, error } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', boardId)
        .select()
        .single();
      
      if (error) throw error;
      res.json({ data, error: null });
    }
  } catch (err) {
    console.error('❌ Error updating board:', err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// Обновить позиции доски (массово через RPC)
app.post('/api/boards/:boardId/items/bulk-update', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { items, telegramId } = req.body;
    
    if (telegramId) {
      const { error } = await supabase.rpc('update_board_items_safe', {
        p_board_id: boardId,
        p_telegram_id: telegramId,
        p_items: items
      });
      
      if (error) throw error;
      res.json({ data: { success: true }, error: null });
    } else {
      // Fallback: обычные запросы
      res.status(400).json({ data: null, error: 'telegramId required' });
    }
  } catch (err) {
    console.error('❌ Error bulk updating items:', err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// Удалить позицию
app.delete('/api/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { telegramId } = req.query;
    
    if (telegramId) {
      const { error } = await supabase.rpc('delete_item_safe', {
        p_item_id: itemId,
        p_telegram_id: parseInt(telegramId)
      });
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('bill_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    }
    
    res.json({ data: null, error: null });
  } catch (err) {
    console.error('❌ Error deleting item:', err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ===== ЭНДПОИНТЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ =====

// Получить доски пользователя (через RPC)
app.get('/api/user/:telegramId/boards', async (req, res) => {
  try {
    const { telegramId } = req.params;
    
    const { data, error } = await supabase
      .rpc('get_user_boards', { p_telegram_id: parseInt(telegramId) });

    if (error) throw error;
    res.json({ data, error: null });
  } catch (err) {
    console.error('❌ Error fetching user boards:', err);
    res.status(500).json({ data: null, error: err.message });
  }
});

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supabase_url: process.env.SUPABASE_URL 
  });
});

// ===== ЛОГИРОВАНИЕ ОШИБОК ОТ КЛИЕНТА =====
app.post('/api/log-error', async (req, res) => {
  try {
    const { message, stack, context, userAgent, url, timestamp, telegramUser } = req.body;
    
    const errorText = `
🔴 <b>Ошибка в Mini App</b>
📱 Пользователь: ${telegramUser?.first_name || 'Unknown'} (@${telegramUser?.username || 'no_username'})
⚠️ Сообщение: <code>${message}</code>
📍 Контекст: ${context || 'N/A'}
🌐 URL: ${url}
🕐 Время: ${timestamp}
📱 UserAgent: ${userAgent?.slice(0, 100)}
${stack ? `\n🔧 Stack:\n<code>${stack.slice(0, 500)}</code>` : ''}
    `.trim();
    
    await logErrorToTelegram(errorText);
    
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error logging client error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Глобальный обработчик ошибок Express
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  logErrorToTelegram(`<code>${req.method} ${req.path}\n${err.message}\n${err.stack?.slice(0, 500)}</code>`);
  res.status(500).json({ data: null, error: 'Internal server error' });
});

// Обработчик необработанных Promise
process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  await logErrorToTelegram(`<b>Unhandled Rejection:</b>\n<code>${reason}</code>`);
});

// Обработчик критических ошибок
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await logErrorToTelegram(`<b>Критическая ошибка прокси:</b>\n<code>${error.message}\n${error.stack?.slice(0, 500)}</code>`);
  process.exit(1); // PM2 перезапустит
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Proxy server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`🔐 Using SERVICE_ROLE_KEY for auth bypass`);
  console.log(`🌐 CORS enabled for Yandex Cloud domains`);
  console.log(`📱 Error logging to Telegram: ${bot && ADMIN_CHANNEL_ID ? '✅' : '❌'}`);
});
