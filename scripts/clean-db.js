const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanDatabase() {
  console.log('🧹 Начинаем очистку базы данных...');
  console.log('⚠️  Внимание: Это удалит ВСЕ чеки и связанные данные!');

  // Удаляем все доски. 
  // Благодаря настройкам внешних ключей (ON DELETE CASCADE) в Supabase,
  // это автоматически удалит связанные items, participants и selections.
  const { error } = await supabase
    .from('boards')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Удалить всё, где ID не равен нулю (то есть всё)

  if (error) {
    console.error('❌ Ошибка при очистке:', error.message);
    return;
  }

  console.log('✅ База данных успешно очищена от чеков!');
}

cleanDatabase();

