-- ReceiptSplitter Supabase Database Schema
-- Выполните этот скрипт в SQL Editor Supabase

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица профилей пользователей
CREATE TABLE public.profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица ресторанов
CREATE TABLE public.restaurants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица досок
CREATE TABLE public.boards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id),
  total_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  receipt_image_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица позиций
CREATE TABLE public.bill_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  emoji TEXT DEFAULT '🍽',
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица участников
CREATE TABLE public.participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  total_amount DECIMAL(10,2) DEFAULT 0,
  is_creator BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица выбора позиций (многие ко многим)
CREATE TABLE public.item_selections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.bill_items(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id, participant_id)
);

-- Индексы для производительности
CREATE INDEX idx_boards_created_by ON public.boards(created_by);
CREATE INDEX idx_boards_status ON public.boards(status);
CREATE INDEX idx_bill_items_board_id ON public.bill_items(board_id);
CREATE INDEX idx_participants_board_id ON public.participants(board_id);
CREATE INDEX idx_item_selections_board_id ON public.item_selections(board_id);
CREATE INDEX idx_item_selections_participant_id ON public.item_selections(participant_id);

-- RLS политики
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_selections ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Политики для boards
CREATE POLICY "Users can view boards they participate in" ON public.boards
  FOR SELECT USING (
    id IN (
      SELECT board_id FROM public.participants 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can create boards" ON public.boards
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their boards" ON public.boards
  FOR UPDATE USING (auth.uid() = created_by);

-- Политики для bill_items
CREATE POLICY "Users can view items from their boards" ON public.bill_items
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM public.participants 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Creators can manage items" ON public.bill_items
  FOR ALL USING (
    board_id IN (
      SELECT id FROM public.boards 
      WHERE created_by = auth.uid()
    )
  );

-- Политики для participants
CREATE POLICY "Users can view participants from their boards" ON public.participants
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM public.participants 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can join boards" ON public.participants
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Политики для item_selections
CREATE POLICY "Users can manage their selections" ON public.item_selections
  FOR ALL USING (
    participant_id IN (
      SELECT id FROM public.participants 
      WHERE profile_id = auth.uid()
    )
  );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставляем тестовые данные
INSERT INTO public.restaurants (name, address) VALUES 
('Кафе Пушкин', 'Тверская ул., 15'),
('Ресторан Белые ночи', 'Невский пр., 28'),
('Столовая №1', 'Ленинский пр., 45');

-- Создаем тестового пользователя (для разработки)
INSERT INTO auth.users (id, email, created_at, updated_at) VALUES 
('00000000-0000-0000-0000-000000000001', 'test@example.com', NOW(), NOW());

INSERT INTO public.profiles (id, telegram_id, username, first_name) VALUES 
('00000000-0000-0000-0000-000000000001', 123456789, 'test_user', 'Тестовый');

-- Создаем тестовую доску
INSERT INTO public.boards (id, name, restaurant_id, total_amount, created_by) VALUES 
('11111111-1111-1111-1111-111111111111', 'Тестовая доска', 
 (SELECT id FROM public.restaurants WHERE name = 'Кафе Пушкин'), 
 1420.00, '00000000-0000-0000-0000-000000000001');

-- Создаем тестовые позиции
INSERT INTO public.bill_items (board_id, name, price, quantity, emoji) VALUES 
('11111111-1111-1111-1111-111111111111', 'Пицца Маргарита', 450.00, 1, '🍕'),
('11111111-1111-1111-1111-111111111111', 'Паста Карбонара', 380.00, 1, '🍝'),
('11111111-1111-1111-1111-111111111111', 'Цезарь с курицей', 320.00, 1, '🥗'),
('11111111-1111-1111-1111-111111111111', 'Капучино', 150.00, 1, '☕'),
('11111111-1111-1111-1111-111111111111', 'Кока-кола', 120.00, 1, '🥤');

-- Создаем тестового участника
INSERT INTO public.participants (board_id, profile_id, name, is_creator) VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Тестовый пользователь', TRUE);

COMMIT;


