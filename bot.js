// ReceiptSplitter Telegram Bot
// Полноценный бот для разделения чеков

// Загружаем переменные окружения из .env файла
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('--- Debug Info ---');
console.log('CWD:', process.cwd());
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Present' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Present' : 'Missing');
console.log('------------------');

const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
// OCR engine switcher (tesseract | yandex)
const { recognizeReceipt } = require('./ocr_engine');
const fs = require('fs');
// const path = require('path'); // Removed duplicate declaration
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Инициализация Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Инициализация бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// ID админского канала для логов
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;

// Функция отправки логов
async function logToAdmin(text, photoFileId = null) {
  if (!ADMIN_CHANNEL_ID) return;
  
  try {
    if (photoFileId) {
      await bot.sendPhoto(ADMIN_CHANNEL_ID, photoFileId, { caption: text });
    } else {
      await bot.sendMessage(ADMIN_CHANNEL_ID, text, { parse_mode: 'HTML' });
    }
  } catch (e) {
    console.error('Ошибка отправки лога:', e.message);
  }
}

// --- REALTIME LOGGING ---
// Слушаем таблицу debug_logs и пересылаем в Telegram
supabase
  .channel('debug_logs_channel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'debug_logs' },
    (payload) => {
      const { user_id, message, meta } = payload.new;
      const time = meta?.duration ? `${meta.duration}ms` : 'N/A';
      const step = meta?.step || 'Unknown';
      
      const logText = `⏱️ <b>Debug Log</b>\nUser: <code>${user_id}</code>\nAction: ${message}\nTime: <b>${time}</b>\nStep: ${step}`;
      logToAdmin(logText);
    }
  )
  .subscribe();
// ------------------------

console.log('🤖 ReceiptSplitter Bot запущен!');

// Обработчик команды /start
bot.onText(/\/start(?:\s+(.*))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  const username = msg.from.username ? `@${msg.from.username}` : '';
  const payload = (match && match[1]) ? String(match[1]).trim() : '';
  
  console.log(`👤 Пользователь ${firstName} (ID: ${chatId}) запустил бота`);
  logToAdmin(`👤 <b>Новый пользователь:</b>\n${firstName} ${username} (ID: <code>${chatId}</code>)\nPayload: ${payload || 'нет'}`);
  
  // Создаем или обновляем профиль пользователя
  const profile = await createOrUpdateProfile(msg.from);
  
  // Fallback для deep-link приглашения: /start join_<boardId>
  if (payload && payload.startsWith('join_')) {
    try {
      const boardId = payload.replace('join_', '').trim();
      const baseUrl = process.env.MINIAPP_URL || 'http://localhost:3000';
      const joinUrl = `${baseUrl}/join/${boardId}`;

      await bot.sendMessage(chatId, '👥 Присоединяйтесь к доске:', {
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Открыть доску', web_app: { url: joinUrl } }
          ]]
        }
      });
      return;
    } catch (e) {
      console.error('Ошибка обработки payload /start:', e);
    }
  }
  
  const welcomeMessage = `
🎉 Привет, ${firstName}!

Я помогу тебе разделить счет между друзьями!

📸 Просто загрузи фото чека, и я:
🤖 Распознаю все позиции автоматически
🎯 Создам доску для выбора
👥 Сгенерирую ссылку для друзей

📂 Все ваши чеки всегда доступны в меню "Мои чеки"

Команды:
/start - начать работу

Готов разделить счет! 💰

—
👨‍💻 Разработано Aleksey Konyashin
https://t.me/alekseyKonyashin
  `;
  
  bot.sendMessage(chatId, welcomeMessage);
});

// Обработчик команды /help (отключен по запросу)
/*
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  const helpMessage = `
📋 Помощь по ReceiptSplitter

Как пользоваться:
1. 📸 Загрузи фото чека
2. 🤖 Я распознаю позиции
3. 🎯 Создам доску для выбора
4. 👥 Пригласи друзей по ссылке
5. 💰 Получи итоговый расчет

Команды:
/start - начать работу
/help - эта справка
/newbill - создать новую доску
/myboards - мои доски

Просто загрузи фото чека и начнем! 📸
  `;
  
  bot.sendMessage(chatId, helpMessage);
});
*/

// Обработчик команды /newbill
bot.onText(/\/newbill/, (msg) => {
  const chatId = msg.chat.id;
  
  const newBillMessage = `
🆕 Создание новой доски

Для создания доски просто загрузи фото чека!

Я автоматически:
• Распознаю все позиции
• Извлеку цены и названия
• Создам доску для выбора
• Сгенерирую ссылку для друзей

📸 Загрузи фото чека сейчас!
  `;
  
  bot.sendMessage(chatId, newBillMessage);
});

// Обработчик команды /myboards
bot.onText(/\/myboards/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  try {
    // Получаем доски пользователя
    const { data: boards, error } = await supabase
      .from('boards')
      .select('id, name, total_amount, created_at, status')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    if (boards.length === 0) {
      bot.sendMessage(chatId, '📭 У вас пока нет досок.\n\nСоздайте первую доску, загрузив фото чека!');
      return;
    }
    
    let message = '📋 Ваши доски:\n\n';
    
    boards.forEach((board, index) => {
      const date = new Date(board.created_at).toLocaleDateString('ru-RU');
      const status = board.status === 'active' ? '🟢 Активна' : '🔴 Завершена';
      
      message += `${index + 1}. ${board.name}\n`;
      message += `   💰 ${board.total_amount}₽ | ${status}\n`;
      message += `   📅 ${date}\n\n`;
    });
    
    message += '💡 Загрузите фото чека для создания новой доски!';
    
    bot.sendMessage(chatId, message);
    
  } catch (error) {
    console.error('Ошибка получения досок:', error);
    bot.sendMessage(chatId, '❌ Ошибка загрузки досок. Попробуйте позже.');
  }
});

// Хранилище состояний пользователей: chatId -> { photoId: string, messageId: number }
const userPhotoState = new Map();

// Обработчик загрузки фото
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  console.log(`📸 Пользователь ${firstName} загрузил фото`);
  
  // Получаем фото максимального размера
  const photo = msg.photo[msg.photo.length - 1];
  
  // Сохраняем состояние
  userPhotoState.set(chatId, {
    photoId: photo.file_id
  });

  // Логируем получение фото
  const username = msg.from.username ? `@${msg.from.username}` : '';
  logToAdmin(`📸 <b>Получено фото чека</b>\nОт: ${firstName} ${username}`, photo.file_id);

  // Отправляем вопрос пользователю
  await bot.sendMessage(
    chatId,
    '🧐 Посмотрите на фото. Все цифры и названия блюд хорошо читаются?\n\nЕсли фото размыто, лучше переснять.',
    {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Всё отлично, распознаем!', callback_data: 'confirm_photo' }
          ],
          [
            { text: '📸 Переснять', callback_data: 'retake_photo' }
          ]
        ]
      }
    }
  );
});

// Обработчик нажатий на кнопки
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  // Убираем часики загрузки с кнопки
  await bot.answerCallbackQuery(query.id);
  
  if (data === 'retake_photo') {
    // Удаляем сообщение с вопросом
    try {
      await bot.deleteMessage(chatId, query.message.message_id);
    } catch (e) {
      console.error('Ошибка удаления сообщения:', e);
    }
    
    await bot.sendMessage(chatId, 'Ок, жду новое фото! 📸');
    userPhotoState.delete(chatId);
    return;
  }
  
  if (data === 'confirm_photo') {
    const state = userPhotoState.get(chatId);
    
    if (!state || !state.photoId) {
      await bot.sendMessage(chatId, '❌ Ошибка: фото не найдено. Пожалуйста, отправьте его снова.');
      return;
    }
    
    // Удаляем кнопки у сообщения с вопросом и меняем текст
    const ocrEngine = (process.env.OCR_ENGINE || 'tesseract').toLowerCase();
    
    try {
      await bot.editMessageText(
    `🔍 Обрабатываю чек…\n\n` +
        `✔️ Фото принято\n` +
    `• Скачиваю файл\n` +
        `• Распознаю чек\n` +
        `• Создаю доску и ссылку\n\n` +
        `⏳ Пожалуйста, подождите 10–20 секунд`,
        {
          chat_id: chatId,
          message_id: query.message.message_id
        }
      );
      
      // Запускаем процесс обработки (вынесли логику в отдельную функцию)
      await processReceipt(chatId, state.photoId, query.from, query.message.message_id);
      
    } catch (error) {
      console.error('Ошибка при старте обработки:', error);
      await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте отправить фото снова.');
    }
    
    // Очищаем состояние
    userPhotoState.delete(chatId);
  }
});

// Функция обработки чека (вынесена из обработчика photo)
async function processReceipt(chatId, fileId, user, statusMessageId) {
  const ocrEngine = (process.env.OCR_ENGINE || 'tesseract').toLowerCase();
  
  // Форматирование чисел с разделителями (1 000)
  const fmt = (num) => num.toLocaleString('ru-RU');

  try {
    const file = await bot.getFile(fileId);
    
    // Скачиваем фото
    const photoUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(photoUrl);
    const buffer = await response.buffer();
    
    // Сохраняем фото временно
    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    const photoPath = path.join(tempDir, `receipt_${Date.now()}.jpg`);
    fs.writeFileSync(photoPath, buffer);
    
    // Обновляем статус
    await bot.editMessageText(
      `🔍 Обрабатываю чек…\n\n` +
      `✔️ Фото принято\n` +
      `✔️ Скачиваю файл\n` +
      `• Распознаю чек\n` +
      `• Создаю доску и ссылку\n\n` +
      `⏳ Пожалуйста, подождите 10–20 секунд`,
      { chat_id: chatId, message_id: statusMessageId }
    );
    
    // Распознаем чек с помощью OCR
    const receiptData = await recognizeReceipt(photoPath);
    
    // Обновляем статус
    await bot.editMessageText(
      `🔍 Обрабатываю чек…\n\n` +
      `✔️ Фото принято\n` +
      `✔️ Скачиваю файл\n` +
      `✔️ Распознаю чек\n` +
      `• Создаю доску и ссылку\n\n` +
      `⏳ Ещё пару секунд…`,
      { chat_id: chatId, message_id: statusMessageId }
    );
    
    // Удаляем временный файл
    fs.unlinkSync(photoPath);
    
    // Преобразуем данные в нужный формат
    const processedReceiptData = {
      restaurant_name: receiptData.restaurant_name || receiptData.restaurant || 'Неизвестный ресторан',
      address: receiptData.address || '',
      date: receiptData.date || new Date().toLocaleDateString('ru-RU'),
      time: receiptData.time || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      total_amount: receiptData.total_amount || receiptData.total || 0,
      items: (receiptData.items || []).map(item => {
        let finalPrice = 0;
        if (item.total_price) {
          finalPrice = parseFloat(item.total_price);
        } else if (item.price && item.quantity) {
          finalPrice = parseFloat(item.price) * parseFloat(item.quantity);
        } else {
          finalPrice = parseFloat(item.price) || 0;
        }
        
        return {
        name: item.name,
          price: finalPrice,
        quantity: item.quantity,
        emoji: getItemEmoji(item.name)
        };
      })
    };
    
    // Получаем профиль пользователя
    const profile = await createOrUpdateProfile(user);
    
    // Создаем доску в Supabase
    const boardId = await createBoardFromReceipt(processedReceiptData, profile.id, user.first_name);
    
    logToAdmin(`✅ <b>Чек обработан!</b>\nРесторан: ${processedReceiptData.restaurant_name}\nСумма: ${fmt(processedReceiptData.total_amount)}₽\nПозиций: ${processedReceiptData.items.length}`);
    
    // Обновляем статус
    await bot.editMessageText(
      '✅ Чек обработан!\n\n🎯 Доска создана!\n\n📱 Ссылка для друзей генерируется...',
      { chat_id: chatId, message_id: statusMessageId }
    );
    
    // Генерируем ссылки на Mini App
    const baseUrl = process.env.MINIAPP_URL || 'http://localhost:3000';
    const boardUrl = `${baseUrl}/board/${boardId}`;
    const joinUrl = `${baseUrl}/join/${boardId}`;
    
    // Рассчитываем сумму позиций для проверки
    const itemsTotal = processedReceiptData.items.reduce((sum, item) => sum + item.price, 0);
    const receiptTotal = processedReceiptData.total_amount;
    const difference = Math.abs(receiptTotal - itemsTotal);
    const isMatching = difference < 1; 

    // Формируем заголовок и статус валидации
    let validationMessage = '';
    let statusHeader = '';
    
    if (isMatching) {
      statusHeader = '✅ Доска создана!';
      validationMessage = '✨ Сумма позиций совпадает с итогом чека.\n👉 Откройте доску и приступайте к разделению!';
    } else {
      statusHeader = '⚠️ Доска создана (есть расхождения)';
      validationMessage = `🧾 Итого на чеке: ${fmt(receiptTotal)} ₽\n` +
                          `∑  Сумма позиций: ${fmt(itemsTotal)} ₽\n` +
                          `🔴 Разница: ${fmt(difference)} ₽\n\n` +
                          `✏️ В распознавании есть неточности. Отредактируйте данные, открыв доску.`;
    }

    // Отправляем результат с WebApp кнопками (НОВОЕ СООБЩЕНИЕ)
    // Мы не редактируем старое сообщение статуса, чтобы оно осталось как лог обработки или можно его удалить
    // В данном случае лучше отправить новое красивое сообщение с кнопками
    
    const resultMessage = `
${statusHeader}

🍽 ${processedReceiptData.restaurant_name}
📍 ${processedReceiptData.address}
📅 ${processedReceiptData.date} в ${processedReceiptData.time}

${validationMessage}

📋 Позиции (${processedReceiptData.items.length}):
${processedReceiptData.items.map((item, i) => `${i+1}. ${item.emoji} ${item.name} — ${fmt(item.price)} ₽`).join('\n')}

Выберите действие:
    `;

    const deepLink = `https://t.me/SplitterReceipt_bot?start=join_${boardId}`;
    const shareText = `👋 ${user.first_name} приглашает разделить счет на ${fmt(receiptTotal)}₽`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(shareText)}`;

    await bot.sendMessage(chatId, resultMessage, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📱 Открыть доску', web_app: { url: boardUrl } },
            { text: '👥 Поделиться', url: shareUrl }
          ]
        ]
      }
    });
    
  } catch (error) {
    console.error('Ошибка обработки фото:', error);
    logToAdmin(`❌ <b>Ошибка обработки:</b>\n${error.message}`);
    const isTimeout = String(error && error.message || '').includes('ETIMEDOUT');
    const hint = isTimeout && ocrEngine === 'yandex'
      ? '\n\nСовет: иногда Yandex Vision отвечает дольше. Попробуйте ещё раз через минуту.'
      : '';
    await bot.editMessageText(
      '❌ Ошибка обработки чека\n\nВозможные причины:\n• Плохое качество фото\n• Нечеткий текст\n• Попробуйте снова' + hint,
      { chat_id: chatId, message_id: statusMessageId }
    );
  }
}

// Функция создания или обновления профиля
async function createOrUpdateProfile(user) {
  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', user.id)
      .single();
    
    if (existingProfile) {
      // Обновляем существующий профиль
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          updated_at: new Date().toISOString()
        })
        .eq('telegram_id', user.id);
      
      if (updateError) throw updateError;
      return existingProfile;
    } else {
      // Создаем новый профиль
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: uuidv4(), // Генерируем UUID для профиля
          telegram_id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      return newProfile;
    }
  } catch (error) {
    console.error('Ошибка создания профиля:', error);
    throw error;
  }
}

// Функция создания доски из чека
async function createBoardFromReceipt(receiptData, profileId, userName) {
  try {
    // Создаем или получаем ресторан
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('name', receiptData.restaurant_name)
      .single();
    
    let restaurantId = restaurant?.id;
    
    if (!restaurantId) {
      const { data: newRestaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: receiptData.restaurant_name,
          address: receiptData.address
        })
        .select()
        .single();
      
      if (restaurantError) {
        console.error('Ошибка создания ресторана:', restaurantError);
        throw restaurantError;
      }
      
      if (!newRestaurant) {
        throw new Error('Не удалось создать ресторан');
      }
      
      restaurantId = newRestaurant.id;
    }
    
    // Создаем доску
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .insert({
        name: `${receiptData.restaurant_name} - ${receiptData.date}`,
        restaurant_id: restaurantId,
        restaurant_name: receiptData.restaurant_name,
        address: receiptData.address,
        total_amount: receiptData.total_amount,
        created_by: profileId
      })
      .select()
      .single();
    
    if (boardError) {
      console.error('Ошибка создания доски:', boardError);
      throw boardError;
    }
    
    if (!board) {
      throw new Error('Не удалось создать доску');
    }
    
    // Создаем позиции
    console.log('📋 Создаем позиции:', receiptData.items);
    
    if (!receiptData.items || receiptData.items.length === 0) {
      console.log('⚠️ Нет позиций для создания');
      // Создаем пустую доску
    } else {
      const itemsData = receiptData.items.map(item => ({
        board_id: board.id,
        name: item.name || 'Неизвестная позиция',
        price: item.price || 0,
        quantity: item.quantity || 1,
        emoji: item.emoji || '🍽️'
      }));
      
      console.log('📝 Данные позиций:', itemsData);
      
      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(itemsData);
      
      if (itemsError) {
        console.error('Ошибка создания позиций:', itemsError);
        throw itemsError;
      }
    }
    
    // Создаем участника-создателя
    await supabase
      .from('participants')
      .insert({
        board_id: board.id,
        profile_id: profileId,
        name: userName,
        is_creator: true,
        total_amount: 0
      });
    
    return board.id;
    
  } catch (error) {
    console.error('Ошибка создания доски:', error);
    throw error;
  }
}

// Обработчик ошибок
bot.on('error', (error) => {
  console.error('❌ Ошибка бота:', error.message);
  logToAdmin(`❌ <b>System Error:</b>\n${error.message}`);
});

bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error.message);
  // Polling errors can be frequent, maybe skip logging to admin or log only critical ones
});

// Обработчик завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Останавливаем бота...');
  bot.stopPolling();
  process.exit(0);
});

// Функция для определения эмодзи по названию позиции
function getItemEmoji(itemName) {
  const name = itemName.toLowerCase();
  
  if (name.includes('пицца') || name.includes('pizza')) return '🍕';
  if (name.includes('паста') || name.includes('макароны') || name.includes('pasta')) return '🍝';
  if (name.includes('салат') || name.includes('salad')) return '🥗';
  if (name.includes('суп') || name.includes('soup')) return '🍲';
  if (name.includes('бургер') || name.includes('burger')) return '🍔';
  if (name.includes('сэндвич') || name.includes('sandwich')) return '🥪';
  if (name.includes('кофе') || name.includes('капучино') || name.includes('латте') || name.includes('coffee')) return '☕';
  if (name.includes('чай') || name.includes('tea')) return '🍵';
  if (name.includes('сок') || name.includes('juice')) return '🧃';
  if (name.includes('кола') || name.includes('coca') || name.includes('pepsi')) return '🥤';
  if (name.includes('вода') || name.includes('water')) return '💧';
  if (name.includes('пиво') || name.includes('beer')) return '🍺';
  if (name.includes('вино') || name.includes('wine')) return '🍷';
  if (name.includes('десерт') || name.includes('торт') || name.includes('dessert')) return '🍰';
  if (name.includes('мороженое') || name.includes('ice cream')) return '🍦';
  if (name.includes('мясо') || name.includes('стейк') || name.includes('meat')) return '🥩';
  if (name.includes('рыба') || name.includes('fish')) return '🐟';
  if (name.includes('курица') || name.includes('chicken')) return '🍗';
  if (name.includes('картошка') || name.includes('картофель') || name.includes('potato')) return '🍟';
  if (name.includes('хлеб') || name.includes('bread')) return '🍞';
  
  return '🍽️'; // Дефолтный эмодзи
}

// Глобальный обработчик ошибок бота
bot.on('polling_error', async (error) => {
  console.error('❌ Polling error:', error.message);
  await logToAdmin(`🚨 <b>Ошибка polling бота:</b>\n<code>${error.message}</code>`);
});

// Обработчик необработанных ошибок
process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  await logToAdmin(`🚨 <b>Необработанная ошибка:</b>\n<code>${reason}</code>`);
});

process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await logToAdmin(`🚨 <b>Критическая ошибка:</b>\n<code>${error.message}\n${error.stack}</code>`);
  process.exit(1); // Перезапуск через PM2
});

console.log('✅ Бот готов к работе!');
console.log('📱 Найдите @SplitterReceipt_bot в Telegram');
console.log('🛑 Нажмите Ctrl+C для остановки');
