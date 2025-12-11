import React, { useState, useEffect, useCallback } from 'react';
import { Board, BillItem } from '../types';

interface EditBoardProps {
  board: Board;
  onSave: (updatedBoard: Board, deletedItemIds: string[]) => void;
  onCancel: () => void;
}

interface EditableItem extends BillItem {
  isNew?: boolean;
  tempQuantity?: string;
  tempPrice?: string;
}

const EditBoard: React.FC<EditBoardProps> = ({ board, onSave, onCancel }) => {
  const [restaurantName, setRestaurantName] = useState(board.restaurant_name || board.restaurant?.name || '');
  const [address, setAddress] = useState(board.address || board.restaurant?.address || '');
  
  // Используем строковое представление для удобства редактирования
  const [totalAmountStr, setTotalAmountStr] = useState(String(board.total_amount || 0));
  
  const [items, setItems] = useState<EditableItem[]>(
    (board.bill_items || []).map(item => ({
      ...item,
      tempQuantity: String(item.quantity),
      tempPrice: String(item.price)
    }))
  );
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string>('');

  // Валидация суммы позиций = общая сумма
  const validateAmounts = useCallback(() => {
    const itemsTotal = items.reduce((sum, item) => {
      const price = parseFloat((item.tempPrice || '0').replace(',', '.')) || 0;
      return sum + price;
    }, 0);
    
    const totalAmount = parseFloat(totalAmountStr.replace(',', '.')) || 0;
    const difference = Math.abs(itemsTotal - totalAmount);
    
    // Допускаем погрешность в 1 рубль
    if (difference > 1) { 
      setValidationError(`Разница: ${Math.round(difference)}₽`);
      return false;
    }
    
    setValidationError('');
    return true;
  }, [items, totalAmountStr]);

  // Проверяем валидацию при изменении данных
  useEffect(() => {
    validateAmounts();
  }, [validateAmounts]);

  const handleItemChange = (index: number, field: keyof EditableItem, value: string) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === 'tempQuantity') {
      item.tempQuantity = value;
      // Для внутренних расчетов
      item.quantity = parseFloat(value.replace(',', '.')) || 0;
    } else if (field === 'tempPrice') {
      item.tempPrice = value;
      item.price = parseFloat(value.replace(',', '.')) || 0;
    } else if (field === 'name') {
      item.name = value;
    } else if (field === 'emoji') {
      item.emoji = value;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleTotalAmountChange = (value: string) => {
    setTotalAmountStr(value);
  };

  const handleAddItem = () => {
    const newItem: EditableItem = {
      id: `temp_${Date.now()}`,
      name: '',
      price: 0,
      quantity: 1,
      emoji: '🍽️',
      board_id: board.id,
      isNew: true,
      tempQuantity: '1',
      tempPrice: '0'
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const itemToRemove = items[index];
    // Если это не временный элемент, добавляем его ID в список на удаление
    if (itemToRemove.id && !itemToRemove.id.startsWith('temp_')) {
      setDeletedItemIds([...deletedItemIds, itemToRemove.id]);
    }
    
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSave = () => {
    const totalAmount = parseFloat(totalAmountStr.replace(',', '.')) || 0;

    // Очищаем items от временных полей
    const cleanItems = items.map(item => {
      const { tempQuantity, tempPrice, ...rest } = item;
      return {
        ...rest,
        quantity: parseFloat((tempQuantity || '0').replace(',', '.')) || 0,
        price: parseFloat((tempPrice || '0').replace(',', '.')) || 0
      };
    });

    const updatedBoard: Board = {
      ...board,
      restaurant_name: restaurantName,
      address: address,
      total_amount: totalAmount,
      bill_items: cleanItems
    };

    onSave(updatedBoard, deletedItemIds);
  };

  const itemsTotal = items.reduce((sum, item) => sum + (parseFloat((item.tempPrice || '0').replace(',', '.')) || 0), 0);
  const currentTotal = parseFloat(totalAmountStr.replace(',', '.')) || 0;

  // Форматтер для чисел с разделителями тысяч
  const fmt = (num: number) => num.toLocaleString('ru-RU');

  return (
    <>
      <style>
      {`
        /* Основной фон как в приложении */
        .edit-board {
          padding: 16px;
          padding-bottom: 120px;
          background: var(--tg-theme-bg-color, #f8f9fa);
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
          color: var(--tg-theme-text-color, #000000);
        }

        /* Хедер - минималистичный */
        .edit-header {
          background: transparent;
          color: var(--tg-theme-text-color, #000000);
          padding: 0;
          margin-bottom: 20px;
          box-shadow: none;
        }

        .edit-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Блоки с полями (как карточки) */
        .edit-section {
          background: var(--tg-theme-secondary-bg-color, #ffffff);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        /* Единый стиль для всех инпутов */
        .unified-input {
          width: 100%;
          font-size: 16px;
          padding: 12px;
          border: 1px solid var(--tg-theme-hint-color, #e9ecef);
          border-radius: 10px;
          background: var(--tg-theme-bg-color, #ffffff);
          color: var(--tg-theme-text-color, #000000);
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .unified-input:focus {
          border-color: var(--tg-theme-button-color, #007aff);
          outline: none;
        }

        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          font-size: 13px;
          color: var(--tg-theme-hint-color, #8e8e93);
          margin-bottom: 6px;
          display: block;
          font-weight: 500;
        }

        /* Карточка товара */
        .edit-item {
          background: var(--tg-theme-secondary-bg-color, #ffffff);
          border: 1px solid var(--tg-theme-hint-color, #e9ecef);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .item-top-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-right: 28px; /* Место под крестик */
        }

        .item-emoji select {
          font-size: 24px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--tg-theme-bg-color, #f8f9fa);
          border: 1px solid var(--tg-theme-hint-color, #e9ecef);
          border-radius: 10px;
          appearance: none;
          text-align: center;
          cursor: pointer;
          color: var(--tg-theme-text-color, #000000);
        }

        .item-name-input {
          flex: 1;
          font-size: 16px;
          font-weight: 500;
          border: none;
          border-bottom: 1px solid var(--tg-theme-hint-color, #ccc);
          padding: 8px 0;
          background: transparent;
          color: var(--tg-theme-text-color, #000000);
          border-radius: 0;
          min-width: 0;
        }
        .item-name-input:focus {
          border-bottom: 1px solid var(--tg-theme-button-color, #007aff);
          outline: none;
        }

        .item-bottom-row {
          display: flex;
          align-items: flex-end;
          gap: 12px;
        }

        .edit-number-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        
        .edit-number-group label {
          font-size: 12px;
          color: var(--tg-theme-hint-color, #8e8e93);
          font-weight: 500;
        }

        /* Кнопка удаления */
        .remove-btn-icon {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 24px;
          height: 24px;
          background: rgba(255, 59, 48, 0.1);
          color: #ff3b30;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
        }

        .add-item-btn {
          width: 100%;
          padding: 14px;
          background: transparent;
          color: var(--tg-theme-button-color, #007aff);
          border: 2px dashed var(--tg-theme-button-color, #007aff);
          border-radius: 12px;
          font-weight: 600;
          margin-bottom: 24px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
        }
        .add-item-btn:active {
          opacity: 0.7;
          background: rgba(0, 122, 255, 0.05);
        }

        /* Плашка с итогами и кнопками */
        .edit-actions-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--tg-theme-bg-color, #ffffff);
          padding: 16px;
          padding-bottom: max(16px, env(safe-area-inset-bottom));
          border-top: 1px solid var(--tg-theme-hint-color, #e9ecef);
          box-shadow: 0 -4px 12px rgba(0,0,0,0.05);
          z-index: 100;
        }

        .actions-buttons {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }

        .save-btn {
          flex: 2;
          background: var(--tg-theme-button-color, #007aff);
          color: var(--tg-theme-button-text-color, #ffffff);
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
        }
        
        .cancel-btn {
          flex: 1;
          background: var(--tg-theme-secondary-bg-color, #e9ecef);
          color: var(--tg-theme-text-color, #000000);
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
        }

        .summary-mini {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          margin-bottom: 8px;
          align-items: center;
          color: var(--tg-theme-text-color, #000000);
        }
        .diff-text {
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          padding: 8px;
          border-radius: 8px;
          width: 100%;
          box-sizing: border-box;
        }
        .diff-text.error { 
          color: #ff3b30; 
          background: rgba(255, 59, 48, 0.1);
        }
        .diff-text.success { 
          color: #34c759; 
          background: rgba(52, 199, 89, 0.1);
        }

      `}
      </style>

    <div className="edit-board">
        {/* Заголовок - теперь простой текст */}
      <div className="edit-header">
          <h2>Редактирование чека</h2>
      </div>

        {/* Основные данные */}
        <div className="edit-section">
          <div className="form-group">
            <label>Ресторан</label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Название места"
              className="unified-input"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Итого по чеку (₽)</label>
            <input
              type="text"
              inputMode="decimal"
              value={totalAmountStr}
              onChange={(e) => handleTotalAmountChange(e.target.value)}
              placeholder="0"
              className="unified-input"
              style={{ fontWeight: '600' }}
            />
          </div>
        </div>

        {/* Позиции */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', marginLeft: '4px' }}>Позиции</h3>
          
          <div className="items-list">
            {items.map((item, index) => (
              <div key={item.id} className="edit-item">
                <div 
                  className="remove-btn-icon"
                  onClick={() => handleRemoveItem(index)}
                >
                  ✕
                </div>

                <div className="item-top-row">
                <div className="item-emoji">
                  <select
                    value={item.emoji}
                    onChange={(e) => handleItemChange(index, 'emoji', e.target.value)}
                  >
                      <option value="🍽️">🍽️</option>
                      <option value="🍷">🍷</option>
                      <option value="🍺">🍺</option>
                      <option value="🍰">🍰</option>
                      <option value="🥗">🥗</option>
                      <option value="🍕">🍕</option>
                      <option value="🍔">🍔</option>
                      <option value="🍜">🍜</option>
                      <option value="☕">☕</option>
                  </select>
                </div>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    className="item-name-input"
                    placeholder="Название блюда"
                      />
                    </div>
                    
                <div className="item-bottom-row">
                  <div className="edit-number-group" style={{ flex: '0 0 90px' }}>
                    <label>Кол-во</label>
                      <input
                      type="text"
                      inputMode="decimal"
                      value={item.tempQuantity}
                      onChange={(e) => handleItemChange(index, 'tempQuantity', e.target.value)}
                      className="unified-input"
                      style={{ textAlign: 'center' }}
                      />
                    </div>
                    
                  <div className="edit-number-group">
                    <label>Сумма (₽)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.tempPrice}
                      onChange={(e) => handleItemChange(index, 'tempPrice', e.target.value)}
                      className="unified-input"
                      style={{ fontWeight: '600' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button className="add-item-btn" onClick={handleAddItem}>
            + Добавить позицию
          </button>
        </div>

        {/* Нижняя панель */}
        <div className="edit-actions-bar">
          {validationError ? (
            <div className="diff-text error">
              ⚠️ {validationError}
          </div>
          ) : (
            <div className="summary-mini">
              <span>Позиций: {fmt(itemsTotal)}₽</span>
              <span>Чек: {fmt(currentTotal)}₽</span>
              <span className="diff-text success" style={{ width: 'auto', padding: '4px 12px' }}>✓ ОК</span>
          </div>
          )}
          
          <div className="actions-buttons">
            <button className="cancel-btn" onClick={onCancel}>
              Отмена
            </button>
            <button 
              className="save-btn" 
              onClick={handleSave}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditBoard;
