// Footer.tsx
// Футер приложения с информацией о разработчике

import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <span className="footer-text">
          Разработано{' '}
          <a 
            href="https://t.me/alekseyKonyashin" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link"
          >
            Aleksey Konyashin
          </a>
        </span>
      </div>
    </footer>
  );
};

export default Footer;
