// ErrorBoundary.tsx
// React компонент для перехвата ошибок рендеринга

import React, { Component, ReactNode } from 'react';
import { logErrorToServer } from '../lib/error-logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ ErrorBoundary caught:', error, errorInfo);
    logErrorToServer(error, `React ErrorBoundary: ${errorInfo.componentStack?.slice(0, 200)}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>😔 Что-то пошло не так</h2>
          <p>Произошла ошибка при загрузке приложения</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              marginTop: '20px',
              cursor: 'pointer'
            }}
          >
            🔄 Перезагрузить
          </button>
          {this.state.error && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary>Детали ошибки (для разработчика)</summary>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '10px', 
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
