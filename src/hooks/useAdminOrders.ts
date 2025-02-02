import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { OrderStatus } from '../types';

type Order = {
  id: number;
  slug: string;
  created_at: string;
  totalPrice: number;
  status: OrderStatus;
  user_email: { email: string } | string;
  items: {
    product: {
      title: string;
      heroImage: string;
    };
    size: string;
    quantity: number;
  }[];
};

export function useAdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching orders...');
      const { data: ordersData, error } = await supabase
        .from('order')
        .select(`
          *,
          user_email:users(email),
          items:order_item(
            quantity,
            size,
            product:product(
              title,
              heroImage
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Received orders data:', ordersData);

      if (ordersData) {
        const formattedOrders: Order[] = ordersData.map((order) => ({
          id: order.id,
          slug: order.slug,
          created_at: order.created_at,
          totalPrice: order.totalPrice,
          status: order.status as OrderStatus,
          user_email: order.user_email,
          items: order.items.map((item: any) => ({
            product: {
              title: item.product?.title || 'Unknown Product',
              heroImage: item.product?.heroImage || '',
            },
            size: item.size,
            quantity: item.quantity,
          })),
        }));
        console.log('Formatted orders:', formattedOrders);
        setOrders(formattedOrders);
      } else {
        console.log('No orders data received');
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('order')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      ));
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Set up real-time subscription
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'order' 
        }, 
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { orders, isLoading, updateOrderStatus, refreshOrders: fetchOrders };
}