import React from 'react';
import { motion } from 'framer-motion';
import { Board, ItemSelection, Participant } from '../types';

interface SummaryCardProps {
  board: Board;
  selections: ItemSelection[];
  participants: Participant[];
}

const SummaryCard: React.FC<SummaryCardProps> = ({ 
  board, 
  selections, 
  participants 
}) => {
  // Функция расчета сумм по алгоритму 1/N
  const calculateParticipantTotals = () => {
    const participantTotals = participants.map(participant => {
      let total = 0;
      const participantSelections = selections.filter(s => s.participant_id === participant.id);
      const detailedSelections: Array<{
        item: any;
        sharePrice: number;
        totalParticipants: number;
      }> = [];

      // Для каждой позиции, которую выбрал участник
      participantSelections.forEach(selection => {
        const item = selection.item;
        if (!item) return;

        // Находим всех участников, выбравших эту позицию
        const itemSelections = selections.filter(s => s.item_id === item.id);
        const totalParticipants = itemSelections.length;

        // Рассчитываем долю участника
        const sharePrice = item.price / Math.max(totalParticipants, 1);
        total += sharePrice;

        detailedSelections.push({
          item,
          sharePrice,
          totalParticipants
        });
      });

      return {
        participant,
        total: Math.round(total),
        selections: participantSelections,
        detailedSelections
      };
    });

    return participantTotals;
  };

  const participantTotals = calculateParticipantTotals();

  // Общая сумма всех выборов
  const totalSelected = participantTotals.reduce((sum, p) => sum + p.total, 0);
  
  // Невыбранные позиции (позиции, которые никто не выбрал)
  const unselectedItems = board.bill_items?.filter(item => {
    const itemSelections = selections.filter(s => s.item_id === item.id);
    return itemSelections.length === 0;
  }) || [];

  const unselectedTotal = unselectedItems.reduce((sum, item) => {
    return sum + item.price;
  }, 0);

  return (
    <motion.div 
      className="summary-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3>💰 Итоговый расчет</h3>
      
      <div className="participant-totals">
        {participantTotals.map(({ participant, total, detailedSelections }) => (
          <div key={participant.id} className="participant-total">
            <div className="participant-total-header">
              <div className="participant-info">
                <span className="name">{participant.name}</span>
                {participant.is_creator && (
                  <span className="creator-badge">👑</span>
                )}
                <span className="total-amount">
                  {total > 0 ? `= ${total}₽` : '= Не выбрано'}
                </span>
              </div>
            </div>
            
            {detailedSelections.length > 0 && (
              <div className="detailed-selections">
                {detailedSelections.map((detail, index) => (
                  <div key={index} className="selection-detail">
                    <span className="item-with-calculation">
                      {detail.item.emoji} {detail.item.name} — {Math.round(detail.sharePrice)}₽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {unselectedItems.length > 0 && (
        <div className="unselected-section">
          <h4>❌ Не выбрано:</h4>
          <div className="unselected-items">
            {unselectedItems.map(item => (
              <div key={item.id} className="unselected-item">
                <span>{item.emoji} {item.name}</span>
                <span>{item.price}₽</span>
              </div>
            ))}
          </div>
          <div className="unselected-total">
            Итого не выбрано: {unselectedTotal}₽
          </div>
        </div>
      )}

      <div className="grand-total">
        <div className="total-line">
          <span>Выбрано участниками:</span>
          <span>{totalSelected}₽</span>
        </div>
        {unselectedTotal > 0 && (
          <div className="total-line">
            <span>Не выбрано:</span>
            <span>{unselectedTotal}₽</span>
          </div>
        )}
        <div className="total-line grand">
          <span>Общая сумма чека:</span>
          <span>{board.total_amount}₽</span>
        </div>
      </div>
    </motion.div>
  );
};

export default SummaryCard;

