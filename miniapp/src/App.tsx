import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { Board, BillItem, ItemSelection } from './types';
import { getBoard, getItemSelections, createItemSelection, updateItemSelection, deleteItemSelection, addParticipantByName, updateBoard, updateBoardItems, deleteBoardItem } from './lib/supabase';
import { subscribeToItemSelections, subscribeToParticipants, unsubscribeFromChannel } from './lib/realtime';
import { initTelegramWebApp, showTelegramAlert, hapticFeedback, getOrCreateGuest } from './lib/telegram';
import ItemCard from './components/ItemCard';
// import ParticipantCard from './components/ParticipantCard';
import BoardHeader from './components/BoardHeader';
import SummaryCard from './components/SummaryCard';
import LoadingSpinner from './components/LoadingSpinner';
import EditBoard from './components/EditBoard';
import MyBoards from './components/MyBoards';
import JoinPage from './JoinPage';
import './App.css';

// Компонент для страницы доски
const BoardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [selections, setSelections] = useState<ItemSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const loadBoardData = useCallback(async () => {
    if (!boardId) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('📥 Загружаем данные доски:', boardId);
      
      const [boardData, selectionsData] = await Promise.all([
        getBoard(boardId),
        getItemSelections(boardId)
      ]);
      
      console.log('✅ Данные загружены:', { board: boardData, selections: selectionsData });
      setBoard(boardData);
      setSelections(selectionsData);
    } catch (err) {
      console.error('❌ Ошибка загрузки данных:', err);
      setError('Не удалось загрузить данные доски');
      showTelegramAlert('Ошибка загрузки данных доски');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  // Проверяем, является ли текущий пользователь создателем доски
  const isCreator = useCallback(() => {
    // Временно разрешаем всем редактировать для удобства тестирования и исправления ошибок OCR
    return true;
    
    // Оригинальная логика (закомментирована)
    /*
    if (!board || !currentUser) {
      console.log('🔍 isCreator: нет board или currentUser', { board: !!board, currentUser: !!currentUser });
      return false;
    }
    
    // ... остальная логика проверки ...
    */
  }, []);

  // Обработчик клика на кнопку редактирования
  const handleEditClick = () => {
    console.log('🔧 Переключаемся в режим редактирования');
    setIsEditMode(true);
  };

  // Обработчик выхода из режима редактирования
  const handleCancelEdit = () => {
    console.log('🔧 Выходим из режима редактирования');
    setIsEditMode(false);
  };

  // Обработчик сохранения изменений
  const handleSaveChanges = async (updatedBoard: Board, deletedItemIds: string[]) => {
    if (!boardId) return;
    
    try {
      console.log('💾 Сохраняем изменения доски:', updatedBoard);
      
      // Получаем telegram_id текущего пользователя
      const telegramId = currentUser?.id;

      // Обновляем основную информацию доски
      await updateBoard(boardId, {
        restaurant_name: updatedBoard.restaurant_name,
        address: updatedBoard.address,
        total_amount: updatedBoard.total_amount
      }, telegramId); 
      
      // Обновляем/создаем позиции
      await updateBoardItems(boardId, updatedBoard.bill_items || [], telegramId);

      // Удаляем удаленные позиции
      if (deletedItemIds && deletedItemIds.length > 0) {
        console.log('🗑 Удаляем позиции:', deletedItemIds);
        await Promise.all(deletedItemIds.map(id => deleteBoardItem(id, telegramId)));
      }
      
      // Перезагружаем данные доски
      await loadBoardData();
      
      // Выходим из режима редактирования
      setIsEditMode(false);
      
      console.log('✅ Изменения успешно сохранены');
      showTelegramAlert('Изменения сохранены!');
    } catch (error: any) {
      console.error('❌ Ошибка сохранения изменений:', error);
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Неизвестная ошибка');
      showTelegramAlert(`Ошибка сохранения: ${errorMessage}`);
    }
  };

  useEffect(() => {
    // Инициализируем Telegram Web App
    initTelegramWebApp();
    
    // Получаем или создаем пользователя
    const user = getOrCreateGuest();
    setCurrentUser(user);
    
    if (boardId) {
      loadBoardData();
    } else {
      setError('ID доски не найден в URL');
      setLoading(false);
    }
  }, [boardId, loadBoardData]);

  // Отдельный useEffect для real-time подписок
  useEffect(() => {
    if (!boardId || !board) return;

    console.log('🔗 Подключаемся к real-time для доски:', boardId);
    
    // Подключаемся к real-time обновлениям
    const selectionsChannel = subscribeToItemSelections(boardId, (newSelections) => {
      console.log('🔄 Получены новые выборы:', newSelections);
      setSelections(newSelections);
    });
    
    const participantsChannel = subscribeToParticipants(boardId, (newParticipants) => {
      console.log('🔄 Получены новые участники:', newParticipants);
      setBoard(prev => prev ? { ...prev, participants: newParticipants } : null);
    });
    
    // Каналы real-time подписки сохранены для очистки
    
    // Очистка при размонтировании
    return () => {
      console.log('🔌 Отключаемся от real-time');
      unsubscribeFromChannel(selectionsChannel);
      unsubscribeFromChannel(participantsChannel);
    };
  }, [boardId, board]); // Зависим от ID доски и объекта доски

  const handleItemClick = async (item: BillItem) => {
    if (!board || !currentUser || !boardId) return;

    // Находим участника для текущего пользователя
    let participant = board.participants?.find(p => 
      p.profile?.telegram_id === currentUser.id || 
      p.name === currentUser.first_name
    );

    // Если участник не найден, создаем его и используем сразу
    if (!participant) {
      try {
        console.log('👤 Создаем участника:', currentUser.first_name);
        const created = await addParticipantByName(boardId, currentUser.first_name, currentUser.id);
        participant = created;
        // Мгновенно добавляем участника в локальное состояние доски
        setBoard(prev => prev ? { ...prev, participants: [ ...(prev.participants || []), created ] } : prev);
      } catch (err) {
        console.error('Ошибка создания участника:', err);
        showTelegramAlert('Не удалось создать участника');
        return;
      }
    }

    if (!participant) {
      showTelegramAlert('Участник не найден');
      return;
    }

    try {
      // Проверяем, есть ли уже выбор для этого участника и позиции
      const existingSelection = selections.find(
        s => s.item_id === item.id && s.participant_id === participant!.id
      );

      if (existingSelection) {
        // Тоггл: если уже выбран — снимаем выбор
        await deleteItemSelection(existingSelection.id);
        setSelections(prev => prev.filter(s => s.id !== existingSelection.id));
        hapticFeedback.impact('light');
      } else {
        // Создаем новый выбор (без quantity)
        console.log('➡️ Создаем выбор', {
          item_id: item.id,
          participant_id: participant!.id,
          board_id: boardId!
        });
        const newSelection = await createItemSelection({
          item_id: item.id,
          participant_id: participant!.id,
          board_id: boardId!
        });
        setSelections(prev => [...prev, newSelection]);
        hapticFeedback.notification('success');
      }
    } catch (err: any) {
      console.error('❌ Ошибка при выборе позиции:', err);
      const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
      showTelegramAlert(`Не удалось выбрать позицию: ${msg}`);
      hapticFeedback.notification('error');
    }
  };

  const handleRemoveSelection = async (selectionId: string) => {
    try {
      await deleteItemSelection(selectionId);
      setSelections(prev => prev.filter(s => s.id !== selectionId));
      hapticFeedback.impact('light');
    } catch (err) {
      console.error('Ошибка при удалении выбора:', err);
      showTelegramAlert('Не удалось удалить выбор');
    }
  };

  const handleUpdateQuantity = async (selectionId: string, quantity: number) => {
    if (quantity <= 0) {
      await handleRemoveSelection(selectionId);
      return;
    }

    try {
      const updatedSelection = await updateItemSelection(selectionId, { quantity });
      setSelections(prev => 
        prev.map(s => s.id === selectionId ? updatedSelection : s)
      );
      hapticFeedback.selection();
    } catch (err) {
      console.error('Ошибка при обновлении количества:', err);
      showTelegramAlert('Не удалось обновить количество');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !board) {
    return (
      <div className="error-container">
        <h2>❌ Ошибка</h2>
        <p>{error || 'Доска не найдена'}</p>
        <button onClick={() => window.location.reload()}>
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <BoardHeader 
        board={board} 
        isCreator={isCreator()} 
        onEditClick={handleEditClick} 
      />
      
      <div className="main-content">
        {/* Режим редактирования */}
        {isEditMode ? (
          <EditBoard
            board={board}
            onSave={handleSaveChanges}
            onCancel={handleCancelEdit}
          />
        ) : (
          <>
            {/* Список позиций */}
            <div className="items-section">
              <h3>🍽️ Позиции - кликните для выбора</h3>
              <div className="items-list">
                {board.bill_items?.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    selections={selections.filter(s => s.item_id === item.id)}
                    onRemoveSelection={handleRemoveSelection}
                    onUpdateQuantity={handleUpdateQuantity}
                    onClick={() => handleItemClick(item)}
                    currentUser={currentUser}
                    board={board}
                  />
                ))}
              </div>
            </div>

            {/* Участники блок удален по новой логике выбора кликом */}
          </>
        )}
      </div>

      {!isEditMode && (
        <SummaryCard 
          board={board}
          selections={selections}
          participants={board.participants || []}
        />
      )}
    </div>
  );
};

// Основной App компонент с роутингом
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/board/:boardId" element={<BoardPage />} />
        <Route path="/join/:boardId" element={<JoinPage />} />
        <Route path="/" element={<MyBoards />} />
      </Routes>
    </Router>
  );
}

export default App;