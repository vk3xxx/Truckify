import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createWebSocket, type Notification } from './api';
import { useAuth } from './AuthContext';

interface WebSocketMessage {
  type: string;
  payload: unknown;
}

interface WebSocketContextType {
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  lastMessage: WebSocketMessage | null;
  clearNotifications: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  notifications: [],
  unreadCount: 0,
  connected: false,
  lastMessage: null,
  clearNotifications: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const handleMessage = useCallback((msg: { type: string; payload: unknown }) => {
    setLastMessage(msg);
    if (msg.type === 'notification') {
      setNotifications(prev => [msg.payload as Notification, ...prev]);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const ws = createWebSocket(user.id, handleMessage);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    return () => {
      ws.close();
      setConnected(false);
    };
  }, [isAuthenticated, user?.id, handleMessage]);

  const clearNotifications = () => setNotifications([]);

  return (
    <WebSocketContext.Provider value={{ notifications, unreadCount: notifications.length, connected, lastMessage, clearNotifications }}>
      {children}
    </WebSocketContext.Provider>
  );
}
