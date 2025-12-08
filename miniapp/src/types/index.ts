// Типы для ReceiptSplitter Mini App

export interface Profile {
  id: string;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface BillItem {
  id: string;
  board_id: string;
  name: string;
  price: number;
  quantity: number;
  emoji?: string;
}

export interface Participant {
  id: string;
  board_id: string;
  profile_id: string;
  name: string;
  is_creator: boolean;
  total_amount: number;
  profile?: Profile;
}

export interface ItemSelection {
  id: string;
  item_id: string;
  participant_id: string;
  quantity: number;
  item?: BillItem;
  participant?: Participant;
}

export interface Board {
  id: string;
  name: string;
  restaurant_id?: string;
  total_amount: number;
  created_by: string;
  status: 'active' | 'completed';
  created_at: string;
  restaurant?: Restaurant;
  participants?: Participant[];
  bill_items?: BillItem[];
  // Добавляем поля для редактирования
  restaurant_name?: string;
  address?: string;
  items?: BillItem[];
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

