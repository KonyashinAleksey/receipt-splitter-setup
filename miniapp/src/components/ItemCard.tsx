import React from 'react';
import { motion } from 'framer-motion';
import { BillItem, ItemSelection, Board } from '../types';

interface ItemCardProps {
  item: BillItem;
  selections: ItemSelection[];
  onRemoveSelection: (selectionId: string) => void;
  onUpdateQuantity: (selectionId: string, quantity: number) => void;
  onClick: () => void;
  currentUser: any;
  board: Board;
}

const ItemCard: React.FC<ItemCardProps> = ({ 
  item, 
  selections, 
  onRemoveSelection, 
  onUpdateQuantity,
  onClick,
  currentUser,
  board
}) => {
  const getParticipantHue = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return hue;
  };

  // Кол-во выборов позиции всеми участниками
  const totalParticipants = selections.length;

  // Проверяем, выбрал ли текущий пользователь эту позицию
  const currentUserSelection = selections.find(s => 
    s.participant?.profile?.telegram_id === currentUser?.id || 
    s.participant?.name === currentUser?.first_name
  );

  const isSelectedByCurrentUser = !!currentUserSelection;

  return (
    <motion.div
      className={`item-card clickable ${isSelectedByCurrentUser ? 'selected' : ''}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="item-header">
        <div className="item-emoji">{item.emoji || '🍽️'}</div>
        <div className="item-info">
          <h4>{item.name}</h4>
          <p className="item-price">{item.quantity} шт. × {Math.round(item.price / item.quantity)}₽ = {item.price}₽</p>
        </div>
        <div className="item-actions">
          {isSelectedByCurrentUser && (
            <span className="selected-badge">✓ Выбрано</span>
          )}
        </div>
      </div>

      {selections.length > 0 && (
        <div className="selections">
          {selections.map((selection) => {
            const participantShare = totalParticipants > 0 ? Math.round(item.price / totalParticipants) : 0;
            const isCurrentUserSelection = 
              selection.participant?.profile?.telegram_id === currentUser?.id || 
              selection.participant?.name === currentUser?.first_name;
            const displayName = selection.participant?.name || 'Участник';
            const hue = getParticipantHue(displayName);

            return (
              <div key={selection.id} className="selection-item">
                <span
                  className="participant-chip"
                  style={{
                    backgroundColor: `hsla(${hue}, 85%, 92%, 1)`,
                    color: `hsl(${hue}, 35%, 28%)`,
                    borderColor: `hsl(${hue}, 45%, 70%)`
                  }}
                >
                  <span className="participant-chip-name">{displayName}</span>
                  <span className="participant-chip-share">{participantShare}₽</span>
                </span>
                {isCurrentUserSelection && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveSelection(selection.id); }}
                    className="remove-btn"
                    title="Удалить мой выбор"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default ItemCard;

