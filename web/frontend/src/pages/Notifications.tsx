import { useState, useEffect } from 'react';
import { Bell, Check, Package, DollarSign, Star, Truck } from 'lucide-react';
import { useAuth } from '../AuthContext';
import api from '../api';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const notificationApi = {
  getNotifications: (userId: string) =>
    api.get<{ success: boolean; data: Notification[] }>(`http://localhost:8014/notifications/user/${userId}`),
  markRead: (id: string) =>
    api.post(`http://localhost:8014/notifications/${id}/read`),
};

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchNotifications();
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getNotifications(user!.id);
      setNotifications(res.data.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'job': return <Package className="h-5 w-5" />;
      case 'payment': return <DollarSign className="h-5 w-5" />;
      case 'rating': return <Star className="h-5 w-5" />;
      case 'delivery': return <Truck className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-400 mt-2">{unreadCount} unread</p>}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="card text-center py-12">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No notifications yet</p>
          </div>
        ) : notifications.map(notification => (
          <div
            key={notification.id}
            className={`card flex items-start gap-4 border-dark-700 ${!notification.read ? 'border-primary-500 bg-dark-700' : ''}`}
          >
            <div className={`p-2 rounded-lg ${!notification.read ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-700 text-gray-400'}`}>
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={`font-medium ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                {!notification.read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="p-2 text-gray-400 hover:text-primary-400 hover:bg-dark-700 rounded-lg"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
