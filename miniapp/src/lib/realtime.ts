// Real-time функции для Supabase
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { ItemSelection, Participant } from '../types';
import { getItemSelections } from './supabase';

// Подписка на изменения выборов позиций
export const subscribeToItemSelections = (
  boardId: string,
  onUpdate: (selections: ItemSelection[]) => void
): RealtimeChannel => {
  console.log(`🔗 Подключаемся к real-time для доски: ${boardId}`);
  
  return supabase
    .channel(`selections-${boardId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'item_selections',
        filter: `board_id=eq.${boardId}`
      },
      async (payload) => {
        console.log('🔄 Real-time: Обновление выборов', payload);
        try {
          const selections = await getItemSelections(boardId);
          onUpdate(selections);
        } catch (error) {
          console.error('Ошибка при обновлении выборов:', error);
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Статус подписки на выборы:', status);
    });
};

// Подписка на изменения участников
export const subscribeToParticipants = (
  boardId: string,
  onUpdate: (participants: Participant[]) => void
): RealtimeChannel => {
  console.log(`🔗 Подключаемся к real-time для участников доски: ${boardId}`);
  
  return supabase
    .channel(`participants-${boardId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `board_id=eq.${boardId}`
      },
      async (payload) => {
        console.log('🔄 Real-time: Обновление участников', payload);
        try {
          const { data, error } = await supabase
            .from('participants')
            .select(`
              *,
              profile:profiles(*)
            `)
            .eq('board_id', boardId);
          
          if (error) {
            console.error('Ошибка при загрузке участников:', error);
            return;
          }
          
          if (data) onUpdate(data);
        } catch (error) {
          console.error('Ошибка при обновлении участников:', error);
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Статус подписки на участников:', status);
    });
};

// Отключение всех подписок
export const unsubscribeFromChannel = (channel: RealtimeChannel) => {
  console.log('🔌 Отключаемся от real-time канала');
  supabase.removeChannel(channel);
};








