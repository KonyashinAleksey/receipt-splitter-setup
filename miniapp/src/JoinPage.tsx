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

  // Получаем ID доски из URL
  useEffect(() => {
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
      
      // Получаем данные пользователя из Telegram или создаем гостя
      const user = getOrCreateGuest();
      
      // Проверяем, не присоединен ли уже пользователь
      const existingParticipant = board.participants?.find(
        p => p.name === user.first_name || p.profile?.telegram_id === user.id
      );

      if (existingParticipant) {
        showTelegramAlert('Вы уже присоединены к этой доске!');
        setJoined(true);
        return;
      }

      // Добавляем участника по имени с telegram_id
      await addParticipantByName(boardId, user.first_name, user.id);

      // Сразу перенаправляем на доску без всплывающего окна
      window.location.href = `/board/${boardId}`;
      
    } catch (err) {
      console.error('Ошибка присоединения:', err);
      showTelegramAlert('Не удалось присоединиться к доске');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>🍽️</div>
        <h2>Загружаем доску...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px' }}>❌</div>
        <h2>Ошибка</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px' }}>🍽️</div>
        <h1>ReceiptSplitter</h1>
        <p>Введите ID доски для присоединения:</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            placeholder="ID доски"
            style={{
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '16px',
              minWidth: '200px'
            }}
          />
          <button
            onClick={() => loadBoard(boardId)}
            disabled={!boardId}
            style={{
              padding: '10px 20px',
              backgroundColor: boardId ? '#007aff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: boardId ? 'pointer' : 'not-allowed'
            }}
          >
            Загрузить
          </button>
        </div>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Или перейдите по ссылке: /join/ID_ДОСКИ
        </p>
      </div>
    );
  }

  const user = getOrCreateGuest();
  const isAlreadyJoined = board.participants?.some(
    p => p.name === user?.first_name || p.profile?.telegram_id === user?.id
  );

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🎉 Присоединиться к доске</h1>
      
      <div style={{ 
        backgroundColor: '#e3f2fd', 
        padding: '16px', 
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <p><strong>👋 Привет, {user.first_name}!</strong></p>
        <p style={{ color: '#666', fontSize: '14px' }}>
          {user.username ? `@${user.username}` : 'Гость'}
        </p>
      </div>
      
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <h2>{board.name}</h2>
        {board.restaurant && (
          <p><strong>Ресторан:</strong> {board.restaurant.name}</p>
        )}
        {board.restaurant?.address && (
          <p><strong>Адрес:</strong> {board.restaurant.address}</p>
        )}
        <p><strong>Общая сумма:</strong> {board.total_amount}₽</p>
        <p><strong>Позиций:</strong> {board.bill_items?.length || 0}</p>
        <p><strong>Участников:</strong> {board.participants?.length || 0}</p>
      </div>

      {board.participants && board.participants.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>👥 Участники:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {board.participants.map((participant) => (
              <div key={participant.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: 'white',
                border: '1px solid #e9ecef',
                borderRadius: '8px'
              }}>
                <div>
                  <strong>{participant.name}</strong>
                  {participant.is_creator && (
                    <span style={{ 
                      marginLeft: '8px',
                      backgroundColor: '#ffd700',
                      color: '#000',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      Создатель
                    </span>
                  )}
                </div>
                <div>
                  <span style={{ color: '#666' }}>
                    {participant.total_amount}₽
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        {isAlreadyJoined || joined ? (
          <div style={{ 
            padding: '20px',
            backgroundColor: '#d4edda',
            borderRadius: '8px',
            color: '#155724'
          }}>
            <h3>✅ Вы уже присоединены!</h3>
            <p>Теперь вы можете участвовать в разделении счета</p>
            <button
              onClick={() => window.location.href = `/board/${boardId}`}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Перейти к доске
            </button>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{
              padding: '16px 32px',
              backgroundColor: joining ? '#ccc' : '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              cursor: joining ? 'not-allowed' : 'pointer',
              minWidth: '200px'
            }}
          >
            {joining ? 'Присоединяемся...' : 'Присоединиться к доске'}
          </button>
        )}
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p><strong>🔗 Поделитесь ссылкой с друзьями:</strong></p>
        <p style={{ 
          fontFamily: 'monospace',
          backgroundColor: 'white',
          padding: '8px',
          borderRadius: '4px',
          wordBreak: 'break-all'
        }}>
          {window.location.origin}/join/{boardId}
        </p>
      </div>
    </div>
  );
};

export default JoinPage;
