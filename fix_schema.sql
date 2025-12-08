-- Добавляем недостающие колонки в таблицу boards
ALTER TABLE public.boards 
ADD COLUMN IF NOT EXISTS restaurant_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Обновляем данные в новых колонках из таблицы restaurants (для существующих записей)
UPDATE public.boards b
SET 
  restaurant_name = r.name,
  address = r.address
FROM public.restaurants r
WHERE b.restaurant_id = r.id 
  AND (b.restaurant_name IS NULL OR b.address IS NULL);

-- Пересоздаем функцию обновления доски (на случай если она не создалась или работает неправильно)
CREATE OR REPLACE FUNCTION public.update_board_safe(
  p_board_id UUID,
  p_telegram_id BIGINT,
  p_restaurant_name TEXT,
  p_address TEXT,
  p_total_amount DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Проверяем существование пользователя
  SELECT id INTO v_user_id FROM public.profiles WHERE telegram_id = p_telegram_id;
  IF v_user_id IS NULL THEN
     RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE public.boards
  SET 
    restaurant_name = p_restaurant_name,
    address = p_address,
    total_amount = p_total_amount
  WHERE id = p_board_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

