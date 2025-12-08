import React, { useState, useEffect } from 'react';
import { Board } from './types';
import { getBoard, addParticipantByName } from './lib/supabase';
import { getOrCreateGuest, showTelegramAlert } from './lib/telegram';

const JoinPage: React.FC = () => {
  const [boardId, setBoardId] = useState('');
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  // Получаем ID доски из URL и разворачиваем окно
  useEffect(() => {
    // Принудительно разворачиваем окно Telegram на полную высоту
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.expand();
    }

    const pathBoardId = window.location.pathname.split('/join/')[1];
    if (pathBoardId) {
      setBoardId(pathBoardId);
      loadBoard(pathBoardId);
    }
  }, []);

  const loadBoard = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const boardData = await getBoard(id);
      setBoard(boardData);
    } catch (err) {
      console.error('Ошибка загрузки доски:', err);
      setError('Доска не найдена или недоступна');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!board || !boardId) return;

    try {
      setJoining(true);
      
      const user = getOrCreateGuest();
      
      const existingParticipant = board.participants?.find(
        p => p.name === user.first_name || p.profile?.telegram_id === user.id
      );

      if (existingParticipant) {
        setJoined(true);
        window.location.href = `/board/${boardId}`;
        return;
      }

      await addParticipantByName(boardId, user.first_name, user.id);
      window.location.href = `/board/${boardId}`;
      
    } catch (err) {
      console.error('Ошибка присоединения:', err);
      showTelegramAlert('Не удалось присоединиться к доске');
    } finally {
      setJoining(false);
    }
  };

  const handleShare = () => {
    const link = `${window.location.origin}/join/${boardId}`;
    navigator.clipboard.writeText(link).then(() => {
      showTelegramAlert('Ссылка скопирована!');
    }).catch(() => {
        showTelegramAlert('Ссылка в адресной строке');
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🍽️</div>
        <div>Загрузка...</div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', marginTop: '40px' }}>
        <h2>❌ Ошибка</h2>
        <p>{error || 'Доска не найдена'}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Обновить
        </button>
      </div>
    );
  }

  const user = getOrCreateGuest();
  const isAlreadyJoined = board.participants?.some(
    p => p.name === user?.first_name || p.profile?.telegram_id === user?.id
  );

  const restaurantName = board.restaurant_name || board.restaurant?.name || 'Ресторан';
  const date = new Date(board.created_at).toLocaleDateString('ru-RU');
  const creator = board.participants?.find(p => p.is_creator)?.name || 'Создатель';

  return (
    <div style={{ 
        padding: '24px 20px 40px 20px', // Больше отступ снизу
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--tg-theme-bg-color, #fff)',
        color: 'var(--tg-theme-text-color, #000)',
        boxSizing: 'border-box'
    }}>
      <style>{`
        .header-section {
            text-align: center;
            margin-bottom: 32px;
            margin-top: 10px;
        }
        .inviter-badge {
            font-size: 16px;
            color: var(--tg-theme-text-color, #000);
            font-weight: 500;
        }
        .inviter-badge span {
            color: var(--tg-theme-button-color, #007aff);
            font-weight: 600;
        }
        .info-card {
            background: var(--tg-theme-secondary-bg-color, #f5f5f5);
            border-radius: 20px;
            padding: 30px 20px;
            text-align: center;
            margin-bottom: 32px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .restaurant-name {
            font-size: 24px;
            font-weight: 700;
            line-height: 1.2;
        }
        .receipt-date {
            color: var(--tg-theme-hint-color, #888);
            font-size: 14px;
        }
        .total-price {
            font-size: 36px;
            font-weight: 800;
            margin-top: 12px;
            color: var(--tg-theme-button-color, #007aff);
        }
        .main-action {
            margin-bottom: 40px;
            width: 100%;
        }
        .btn-join {
            width: 100%;
            padding: 18px;
            border-radius: 16px;
            background-color: var(--tg-theme-button-color, #007aff);
            color: var(--tg-theme-button-text-color, #fff);
            font-size: 18px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,122,255, 0.3);
            transition: transform 0.1s;
        }
        .btn-join:active {
            transform: scale(0.98);
        }
        .btn-outline {
            background: transparent;
            color: var(--tg-theme-button-color, #007aff);
            border: none;
            padding: 10px;
            font-size: 14px;
            margin-top: 12px;
            width: 100%;
            cursor: pointer;
        }
        .participants-section {
            text-align: center;
        }
        .section-label {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--tg-theme-hint-color, #aaa);
            margin-bottom: 16px;
        }
        .chips-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
        }
        .user-chip {
            background: var(--tg-theme-secondary-bg-color, #f0f0f0);
            padding: 8px 14px;
            border-radius: 12px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
      `}</style>

      {/* 1. Кто приглашает */}
      <div className="header-section">
        <div style={{ fontSize: '42px', marginBottom: '16px' }}>👋</div>
        <div className="inviter-badge">
            <span>{creator}</span> приглашает вас<br/>разделить чек
        </div>
      </div>
      
      {/* 2. Инфо о чеке */}
      <div className="info-card">
        <div className="restaurant-name">{restaurantName}</div>
        <div className="receipt-date">{date}</div>
        <div className="total-price">
            {board.total_amount.toLocaleString('ru-RU')} ₽
        </div>
      </div>

      {/* 3. Кнопка действия (Главная) */}
      <div className="main-action">
        {isAlreadyJoined || joined ? (
          <button className="btn-join" onClick={() => window.location.href = `/board/${boardId}`}>
            Перейти к чеку →
          </button>
        ) : (
          <button className="btn-join" onClick={handleJoin} disabled={joining}>
            {joining ? 'Входим...' : 'Присоединиться'}
          </button>
        )}
        
        <button className="btn-outline" onClick={handleShare}>
            🔗 Скопировать ссылку
        </button>
      </div>

      {/* 4. Участники */}
      <div className="participants-section">
        <div className="section-label">Уже участвуют</div>
        <div className="chips-container">
            {board.participants?.map((p) => (
                <div key={p.id} className="user-chip">
                    {p.name} {p.is_creator ? '👑' : ''}
                </div>
            ))}
        </div>
      </div>

    </div>
  );
};

export default JoinPage;
