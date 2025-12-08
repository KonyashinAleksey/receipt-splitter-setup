import React from 'react';
import { motion } from 'framer-motion';
import { Board } from '../types';

interface BoardHeaderProps {
  board: Board;
  isCreator: boolean;
  onEditClick: () => void;
}

const BoardHeader: React.FC<BoardHeaderProps> = ({ board, isCreator, onEditClick }) => {
  const displayTitle = board.restaurant_name 
    ? `${board.restaurant_name} - ${new Date(board.created_at).toLocaleDateString('ru-RU')}`
    : board.name;

  const displayName = board.restaurant_name || board.restaurant?.name;
  const displayAddress = board.address || board.restaurant?.address;

  return (
    <motion.header 
      className="board-header"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="board-title">
        <h1>{displayTitle}</h1>
        {displayName && (
          <p className="restaurant-name">🍽️ {displayName}</p>
        )}
        {displayAddress && (
          <p className="restaurant-address">📍 {displayAddress}</p>
        )}
      </div>
      
      <div className="board-stats">
        <div className="stat">
          <span className="stat-label">Общая сумма</span>
          <span className="stat-value">{board.total_amount}₽</span>
        </div>
        <div className="stat">
          <span className="stat-label">Позиций</span>
          <span className="stat-value">{board.bill_items?.length || 0}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Участников</span>
          <span className="stat-value">{board.participants?.length || 0}</span>
        </div>
      </div>
      
      {isCreator && (
        <div className="board-actions">
          <button 
            className="edit-btn"
            onClick={onEditClick}
            title="Редактировать доску"
          >
            ✏️ Редактировать
          </button>
        </div>
      )}
    </motion.header>
  );
};

export default BoardHeader;

