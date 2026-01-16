// error-logger.ts
// Логирование ошибок клиентского приложения

const PROXY_URL = process.env.REACT_APP_PROXY_URL;

export async function logErrorToServer(error: Error, context?: string) {
  try {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      telegramUser: (window as any).Telegram?.WebApp?.initDataUnsafe?.user
    };

    console.error('📤 Sending error to server:', errorData);

    // Отправляем на прокси-сервер
    await fetch(`${PROXY_URL}/api/log-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    });
  } catch (e) {
    console.error('Failed to log error to server:', e);
  }
}

// Глобальный обработчик ошибок
export function setupGlobalErrorHandler() {
  window.addEventListener('error', (event) => {
    console.error('❌ Global error:', event.error);
    logErrorToServer(event.error, 'Global error handler');
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    logErrorToServer(error, 'Unhandled promise rejection');
  });
}
