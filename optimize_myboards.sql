CREATE OR REPLACE FUNCTION public.get_user_boards(p_telegram_id BIGINT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  total_amount DECIMAL,
  created_at TIMESTAMPTZ,
  restaurant_name TEXT,
  is_creator BOOLEAN,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Get profile ID
  SELECT id INTO v_profile_id FROM public.profiles WHERE telegram_id = p_telegram_id;
  
  IF v_profile_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.total_amount,
    b.created_at,
    COALESCE(b.restaurant_name, r.name) as restaurant_name,
    p.is_creator,
    b.status
  FROM public.participants p
  JOIN public.boards b ON b.id = p.board_id
  LEFT JOIN public.restaurants r ON r.id = b.restaurant_id
  WHERE p.profile_id = v_profile_id
  ORDER BY b.created_at DESC
  LIMIT 50;
END;
$$;

