import { useEffect, useState } from 'react';
import { errorHandler } from '../../services/errorHandler';
import type { AppError } from '../../services/errorHandler';
import './ErrorNotification.css';

interface Notification {
  id: string;
  error: AppError;
}

export const ErrorNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = errorHandler.addErrorListener((error: AppError) => {
      const notification: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        error
      };
      
      setNotifications(prev => [...prev, notification]);
      
      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    });

    return unsubscribe;
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="error-notifications">
      {notifications.map(({ id, error }) => (
        <div 
          key={id} 
          className={`error-notification ${error.recoverable ? 'recoverable' : 'critical'}`}
        >
          <div className="notification-content">
            <div className="notification-icon">
              {error.recoverable ? '⚠️' : '❌'}
            </div>
            <div className="notification-text">
              <div className="notification-message">{error.message}</div>
              {error.details && process.env.NODE_ENV === 'development' && (
                <div className="notification-details">{error.details}</div>
              )}
            </div>
            <button 
              className="notification-close"
              onClick={() => removeNotification(id)}
              aria-label="关闭通知"
            >
              ✕
            </button>
          </div>
          <div className="notification-progress" />
        </div>
      ))}
    </div>
  );
};