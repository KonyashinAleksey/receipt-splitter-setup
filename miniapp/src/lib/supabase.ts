// Supabase клиент для Mini App
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://lhrgysrrakswjajwlnsw.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxocmd5c3JyYWtzd2phandsbnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjU0OTQsImV4cCI6MjA3MzI0MTQ5NH0.65aW45qp6ZwApLDJJv7G8nfvYopBkYCVfYudQxmtttI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Функции для работы с досками
export const getBoard = async (boardId: string) => {
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
  return data;
};

export const getItemSelections = async (boardId: string) => {
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
  return data;
};

export const createItemSelection = async (selection: {
  item_id: string;
  participant_id: string;
  board_id: string;
}) => {
  // Используем upsert для избежания дублирования
  const { data, error } = await supabase
    .from('item_selections')
    .upsert({
      item_id: selection.item_id,
      participant_id: selection.participant_id,
      board_id: selection.board_id
    }, {
      onConflict: 'item_id,participant_id' // Уникальное ограничение
    })
    .select(`
      *,
      item:bill_items(*),
      participant:participants(*, profile:profiles(*))
    `)
    .single();

  if (error) throw error;
  return data;
};

export const updateItemSelection = async (id: string, updates: Record<string, unknown>) => {
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
  return data;
};

export const deleteItemSelection = async (id: string) => {
  const { error } = await supabase
    .from('item_selections')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const addParticipant = async (boardId: string, profile: {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}) => {
  // Сначала создаем или получаем профиль
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', profile.telegram_id)
    .single();

  let profileId: string;
  
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
  return data;
};

// Функция для создания участника по имени (для браузера)
export const addParticipantByName = async (boardId: string, name: string, telegramId?: number) => {
  let profileId: string;

  if (telegramId) {
    // Если есть telegram_id, ищем существующий профиль или создаем новый
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (existingProfile) {
      profileId = existingProfile.id;
    } else {
      // Создаем новый профиль с реальным telegram_id
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          telegram_id: telegramId,
          first_name: name,
          last_name: ''
        })
        .select()
        .single();
      
      if (profileError) throw profileError;
      profileId = newProfile.id;
    }
  } else {
    // Fallback для случаев без telegram_id (браузерное тестирование)
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        telegram_id: Math.floor(Math.random() * 1000000), // Временный ID
        first_name: name,
        last_name: ''
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
      name: name,
      is_creator: false,
      total_amount: 0
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Функция для обновления доски (через RPC)
export const updateBoard = async (boardId: string, updates: {
  restaurant_name?: string;
  address?: string;
  total_amount?: number;
}, telegramId?: number) => {
  
  // Если telegramId не передан, пробуем обычный update (может не сработать из-за RLS)
  if (!telegramId) {
    const { data, error } = await supabase
      .from('boards')
      .update(updates)
      .eq('id', boardId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Используем RPC
  const { data, error } = await supabase.rpc('update_board_safe', {
    p_board_id: boardId,
    p_telegram_id: telegramId,
    p_restaurant_name: updates.restaurant_name || '',
    p_address: updates.address || '',
    p_total_amount: updates.total_amount || 0
  });

  if (error) throw error;
  return data;
};

// Функция для обновления позиции (для внутреннего использования или точечных обновлений)
export const updateItem = async (itemId: string, updates: {
  name?: string;
  price?: number;
  quantity?: number;
  emoji?: string;
}) => {
  const { data, error } = await supabase
    .from('bill_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Функция для создания новой позиции
export const createItem = async (item: {
  board_id: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string;
}) => {
  const { data, error } = await supabase
    .from('bill_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Функция для удаления позиции
export const deleteBoardItem = async (itemId: string, telegramId?: number) => {
  // Если передан telegramId, используем безопасную функцию
  if (telegramId) {
    const { error } = await supabase.rpc('delete_item_safe', {
      p_item_id: itemId,
      p_telegram_id: telegramId
    });
    if (error) throw error;
    return;
  }

  // Иначе обычное удаление
  const { error } = await supabase
    .from('bill_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
};

// Функция для массового обновления позиций (через RPC и обычные запросы)
export const updateBoardItems = async (boardId: string, items: Array<{
  id?: string;
  name: string;
  price: number;
  quantity: number;
  emoji?: string;
  isNew?: boolean;
}>, telegramId?: number) => {
  
  // Если есть telegramId, используем RPC для безопасного массового обновления
  if (telegramId) {
    const { error } = await supabase.rpc('update_board_items_safe', {
      p_board_id: boardId,
      p_telegram_id: telegramId,
      p_items: items // RPC функция сама разберется с create/update
    });
    if (error) throw error;
    return { success: true };
  }
  
  // Простой вариант (без защиты): пробегаемся по списку и делаем Upsert
  const upsertPromises = items.map(async (item) => {
    if (item.isNew || !item.id || item.id.startsWith('temp_')) {
      // Создание
      return createItem({
        board_id: boardId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        emoji: item.emoji || '🍽️'
      });
    } else {
      // Обновление
      return updateItem(item.id, {
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        emoji: item.emoji
      });
    }
  });

  // Ждем завершения всех операций
  await Promise.all(upsertPromises);
  
  return { success: true };
};