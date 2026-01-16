// get-stats.js
// Получение статистики проекта

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getStats() {
  console.log('📊 Получаем статистику Receipt Splitter Bot...\n');

  try {
    // 1. Количество уникальных пользователей
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) throw profilesError;
    const totalUsers = profiles.length;

    // 2. Количество просканированных чеков (досок)
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('*');
    
    if (boardsError) throw boardsError;
    const totalBoards = boards.length;

    // 3. Самый большой чек
    const { data: biggestBoard, error: biggestError } = await supabase
      .from('boards')
      .select('*, restaurant:restaurants(*)')
      .order('total_amount', { ascending: false })
      .limit(1)
      .single();
    
    if (biggestError && biggestError.code !== 'PGRST116') throw biggestError;

    // 4. Самая большая компания (больше всего участников)
    const { data: boardsWithParticipants, error: participantsError } = await supabase
      .from('boards')
      .select(`
        *,
        restaurant:restaurants(*),
        participants(*)
      `);
    
    if (participantsError) throw participantsError;

    let biggestCompany = null;
    let maxParticipants = 0;
    
    boardsWithParticipants.forEach(board => {
      const participantCount = board.participants?.length || 0;
      if (participantCount > maxParticipants) {
        maxParticipants = participantCount;
        biggestCompany = board;
      }
    });

    // 5. Общая сумма всех чеков
    const totalAmount = boards.reduce((sum, board) => sum + (parseFloat(board.total_amount) || 0), 0);

    // 6. Средний чек
    const avgAmount = totalBoards > 0 ? totalAmount / totalBoards : 0;

    // 7. Топ ресторанов
    const restaurantStats = {};
    boards.forEach(board => {
      const restName = board.restaurant_name || 'Неизвестный';
      restaurantStats[restName] = (restaurantStats[restName] || 0) + 1;
    });
    
    const topRestaurants = Object.entries(restaurantStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Вывод статистики
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 СТАТИСТИКА RECEIPT SPLITTER BOT');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('👥 ПОЛЬЗОВАТЕЛИ:');
    console.log(`   Всего пользователей: ${totalUsers}`);
    console.log('');

    console.log('📄 ЧЕКИ:');
    console.log(`   Всего чеков просканировано: ${totalBoards}`);
    console.log(`   Общая сумма всех чеков: ${totalAmount.toFixed(2)} ₽`);
    console.log(`   Средний чек: ${avgAmount.toFixed(2)} ₽`);
    console.log('');

    console.log('💰 САМЫЙ БОЛЬШОЙ ЧЕК:');
    if (biggestBoard) {
      console.log(`   Сумма: ${biggestBoard.total_amount} ₽`);
      console.log(`   Ресторан: ${biggestBoard.restaurant_name || 'Неизвестный'}`);
      console.log(`   Адрес: ${biggestBoard.address || 'N/A'}`);
      console.log(`   Дата: ${new Date(biggestBoard.created_at).toLocaleString('ru-RU')}`);
    } else {
      console.log('   Нет данных');
    }
    console.log('');

    console.log('👨‍👩‍👧‍👦 САМАЯ БОЛЬШАЯ КОМПАНИЯ:');
    if (biggestCompany) {
      console.log(`   Участников: ${maxParticipants} человек`);
      console.log(`   Ресторан: ${biggestCompany.restaurant_name || 'Неизвестный'}`);
      console.log(`   Сумма чека: ${biggestCompany.total_amount} ₽`);
      console.log(`   Дата: ${new Date(biggestCompany.created_at).toLocaleString('ru-RU')}`);
    } else {
      console.log('   Нет данных');
    }
    console.log('');

    console.log('🍽️ ТОП-5 РЕСТОРАНОВ:');
    topRestaurants.forEach(([name, count], index) => {
      console.log(`   ${index + 1}. ${name}: ${count} чек(ов)`);
    });
    console.log('');

    console.log('═══════════════════════════════════════════════════');
    
    // Детальная информация о пользователях
    console.log('\n📋 ДЕТАЛИ ПОЛЬЗОВАТЕЛЕЙ:');
    profiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. ${profile.first_name || 'Unknown'} ${profile.last_name || ''} (@${profile.username || 'no_username'})`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error.message);
    process.exit(1);
  }
}

getStats();
