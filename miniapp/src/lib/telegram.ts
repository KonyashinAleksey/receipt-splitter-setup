// Telegram Web App API интеграция
import { TelegramUser } from '../types';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          query_id?: string;
          auth_date?: number;
          hash?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: {
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
          hint_color?: string;
          bg_color?: string;
          text_color?: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        isClosingConfirmationEnabled: boolean;
        BackButton: {
          isVisible: boolean;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          setParams: (params: {
            text?: string;
            color?: string;
            text_color?: string;
            is_active?: boolean;
            is_visible?: boolean;
          }) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        openInvoice: (url: string, callback?: (status: string) => void) => void;
        showPopup: (params: {
          title?: string;
          message: string;
          buttons?: Array<{
            id?: string;
            type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
            text?: string;
          }>;
        }, callback?: (buttonId: string) => void) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        showScanQrPopup: (params: {
          text?: string;
        }, callback?: (text: string) => void) => void;
        closeScanQrPopup: () => void;
        readTextFromClipboard: (callback?: (text: string) => void) => void;
        requestWriteAccess: (callback?: (granted: boolean) => void) => void;
        requestContact: (callback?: (granted: boolean) => void) => void;
      };
    };
  }
}

export const getTelegramUser = (): TelegramUser | null => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return window.Telegram.WebApp.initDataUnsafe.user;
  }
  
  // Для тестирования в браузере возвращаем тестового пользователя
  if (typeof window !== 'undefined' && !window.Telegram?.WebApp) {
    return {
      id: 123456789,
      first_name: 'Тестовый',
      last_name: 'Пользователь',
      username: 'test_user'
    };
  }
  
  return null;
};

// Функция для получения или создания гостя
export const getOrCreateGuest = (): TelegramUser => {
  const telegramUser = getTelegramUser();
  
  if (telegramUser) {
    return telegramUser;
  }
  
  // Создаем гостя с уникальным ID
  const guestId = Math.floor(Math.random() * 1000000) + 100000;
  const guestNumber = Math.floor(Math.random() * 100) + 1;
  
  return {
    id: guestId,
    first_name: `Гость ${guestNumber}`,
    last_name: '',
    username: `guest_${guestId}`
  };
};

export const initTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    try {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      
      // Настраиваем кнопку "Назад"
      window.Telegram.WebApp.BackButton.onClick(() => {
        window.history.back();
      });
      
      return true;
    } catch (error) {
      console.warn('Ошибка инициализации Telegram WebApp:', error);
      return false;
    }
  }
  
  // Для тестирования в браузере
  console.log('🌐 Запуск в браузере (не в Telegram)');
  return false;
};

export const showTelegramAlert = (message: string) => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    try {
      window.Telegram.WebApp.showAlert(message);
    } catch (error) {
      console.warn('Telegram WebApp API недоступен:', error);
      alert(message);
    }
  } else {
    alert(message);
  }
};

export const showTelegramConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.showConfirm(message, resolve);
    } else {
      resolve(window.confirm(message));
    }
  });
};

export const hapticFeedback = {
  impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  },
  notification: (type: 'error' | 'success' | 'warning') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
    }
  },
  selection: () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.selectionChanged();
    }
  }
};
