import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Participant, ItemSelection } from '../types';

interface ParticipantCardProps {
  participant: Participant;
  selections: ItemSelection[];
  onRemoveSelection: (selectionId: string) => void;
  onUpdateQuantity: (selectionId: string, quantity: number) => void;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({ 
  participant, 
  selections, 
  onRemoveSelection, 
  onUpdateQuantity 
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: participant.id,
  });

  const totalAmount = selections.reduce((sum, selection) => {
    return sum + (selection.item?.price || 0) * selection.quantity;
  }, 0);

  return (
    <motion.div
      ref={setNodeRef}
      className={`participant-card ${isOver ? 'drop-target' : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="participant-header">
        <div className="participant-avatar">
          {participant.profile?.first_name?.[0] || participant.name[0]}
        </div>
        <div className="participant-info">
          <h4>{participant.name}</h4>
          {participant.is_creator && (
            <span className="creator-badge">Создатель</span>
          )}
        </div>
        <div className="participant-total">
          {totalAmount > 0 && `${totalAmount}₽`}
        </div>
      </div>

      {selections.length > 0 && (
        <div className="participant-selections">
          {selections.map((selection) => (
            <div key={selection.id} className="selection-item">
              <span className="item-name">
                {selection.item?.emoji} {selection.item?.name}
              </span>
              <div className="quantity-controls">
                <button
                  onClick={() => onUpdateQuantity(selection.id, selection.quantity - 1)}
                  className="quantity-btn"
                >
                  -
                </button>
                <span className="quantity">{selection.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(selection.id, selection.quantity + 1)}
                  className="quantity-btn"
                >
                  +
                </button>
                <button
                  onClick={() => onRemoveSelection(selection.id)}
                  className="remove-btn"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selections.length === 0 && (
        <div className="empty-state">
          <p>Перетащите сюда позиции</p>
        </div>
      )}
    </motion.div>
  );
};

export default ParticipantCard;








