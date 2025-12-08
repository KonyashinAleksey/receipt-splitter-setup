-- Упрощенная настройка Real-time для тестирования
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Включаем real-time для таблиц
ALTER PUBLICATION supabase_realtime ADD TABLE item_selections;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE boards;

-- 2. Отключаем RLS временно для тестирования
ALTER TABLE item_selections DISABLE ROW LEVEL SECURITY;
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE boards DISABLE ROW LEVEL SECURITY;

-- 3. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_item_selections_board_id ON item_selections(board_id);
CREATE INDEX IF NOT EXISTS idx_item_selections_participant_id ON item_selections(participant_id);
CREATE INDEX IF NOT EXISTS idx_participants_board_id ON participants(board_id);
CREATE INDEX IF NOT EXISTS idx_participants_profile_id ON participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON profiles(telegram_id);

-- Готово! Real-time настроен для тестирования
SELECT 'Simple real-time setup completed!' as status;








