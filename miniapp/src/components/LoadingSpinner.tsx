import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-container">
      <motion.div
        className="spinner"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        🍽️
      </motion.div>
      <h2>Загружаем доску...</h2>
      <p>Пожалуйста, подождите</p>
    </div>
  );
};

export default LoadingSpinner;








