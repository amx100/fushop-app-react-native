import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/auth-provider';
import { Tables } from '../types/database.types';

export const useOrderNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user?.id) return;

    // Fetch initial unread count
    fetchUnreadCount();

    // Set up real-time subscription for order status changes
    const channel = supabase
      .channel('order_notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
         
          // Add notification for status change
          addNotification({
            id: Date.now(),
            type: 'order_status',
            orderId: payload.new.id,
            status: payload.new.status,
            message: `Your order #${payload.new.id} status changed to ${payload.new.status}`,
            timestamp: new Date().toISOString(),
            read: false,
          });
          // Update unread count
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const fetchUnreadCount = async () => {
    if (!session?.user?.id) return;

    try {
      // For now, we'll count orders with status changes in the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await supabase
        .from('order')
        .select('id, status, created_at')
        .eq('user_id', session.user.id)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Count orders that have been updated (status changed)
      const updatedOrders = data?.filter((order, index, self) => 
        index === self.findIndex(o => o.id === order.id)
      ) || [];

      setUnreadCount(updatedOrders.length);
    } catch (error) {
    }
  };

  const addNotification = (notification: any) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
  };

  const markAsRead = async (notificationId: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  return {
    unreadCount,
    notifications,
    markAsRead,
    markAllAsRead,
    fetchUnreadCount,
  };
};
