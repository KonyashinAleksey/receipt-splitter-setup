// miniapp/src/lib/proxy-client.ts
// Клиент для работы с прокси-API вместо прямого Supabase

const PROXY_URL = process.env.REACT_APP_PROXY_URL || 'http://localhost:3001';

interface ProxyResponse<T> {
  data: T | null;
  error: string | null;
}

// Получить доску
export const getBoard = async (boardId: string) => {
  const response = await fetch(`${PROXY_URL}/api/boards/${boardId}`);
  const result: ProxyResponse<any> = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
};

// Получить выборы позиций
export const getItemSelections = async (boardId: string) => {
  const response = await fetch(`${PROXY_URL}/api/boards/${boardId}/selections`);
  const result: ProxyResponse<any[]> = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
};

// Создать выбор позиции
export const createItemSelection = async (selection: {
  item_id: string;
  participant_id: string;
  board_id: string;
}) => {
  const response = await fetch(`${PROXY_URL}/api/item-selections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selection)
  });
  const result: ProxyResponse<any> = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
};

// Удалить выбор позиции
export const deleteItemSelection = async (id: string) => {
  const response = await fetch(`${PROXY_URL}/api/item-selections/${id}`, {
    method: 'DELETE'
  });
  const result: ProxyResponse<null> = await response.json();
  if (result.error) throw new Error(result.error);
};

// Обновить выбор позиции
export const updateItemSelection = async (id: string, updates: Record<string, unknown>) => {
  const response = await fetch(`${PROXY_URL}/api/item-selections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  const result: ProxyResponse<any> = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
};

// Добавить участника
export const addParticipant = async (boardId: string, profile: {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}) => {
  const response = await fetch(`${PROXY_URL}/api/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, profile })
  });
  const result: ProxyResponse<any> = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
};

// Функция для создания участника по имени (для браузера)
export const addParticipantByName = async (boardId: string, name: string, telegramId?: number) => {
  const profile = {
    telegram_id: telegramId || Math.floor(Math.random() * 1000000),
    first_name: name,
    username: '',
    last_name: ''
  };
  return addParticipant(boardId, profile);
};

// Обновить доску
export const updateBoard = async (boardId: string, updates: {
  restaurant_name?: string;
  address?: string;
  total_amount?: number;
}, telegramId?: number) => {
  const response = await fetch(`${PROXY_URL}/api/boards/${boardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates, telegramId })
  });
  const result: ProxyResponse<any> = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
};

// Функция для обновления позиции (для внутреннего использования или точечных обновлений)
export const updateItem = async (itemId: string, updates: {
  name?: string;
  price?: number;
  quantity?: number;
  emoji?: string;
}) => {
  // Пока не реализовано в прокси, можно добавить позже если нужно
  throw new Error('updateItem not implemented in proxy');
};

// Функция для создания новой позиции
export const createItem = async (item: {
  board_id: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string;
}) => {
  // Пока не реализовано в прокси, можно добавить позже если нужно
  throw new Error('createItem not implemented in proxy');
};

// Массовое обновление позиций
export const updateBoardItems = async (boardId: string, items: Array<{
  id?: string;
  name: string;
  price: number;
  quantity: number;
  emoji?: string;
  isNew?: boolean;
}>, telegramId?: number) => {
  const response = await fetch(`${PROXY_URL}/api/boards/${boardId}/items/bulk-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, telegramId })
  });
  const result: ProxyResponse<any> = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
};

// Удалить позицию
export const deleteBoardItem = async (itemId: string, telegramId?: number) => {
  const url = telegramId 
    ? `${PROXY_URL}/api/items/${itemId}?telegramId=${telegramId}`
    : `${PROXY_URL}/api/items/${itemId}`;
    
  const response = await fetch(url, { method: 'DELETE' });
  const result: ProxyResponse<null> = await response.json();
  if (result.error) throw new Error(result.error);
};
