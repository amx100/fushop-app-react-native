import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { OrderStatus } from '../types';
import { Toast } from 'react-native-toast-notifications';
import { useEffect } from 'react';

type Order = {
  id: number;
  slug: string;
  created_at: string;
  totalPrice: number;
  status: OrderStatus;
  user_email: { email: string };
  items: {
    product: {
      title: string;
      heroImage: string;
    };
    size: string;
    quantity: number;
  }[];
};

// Add type for raw database response
type OrderResponse = {
  id: number;
  slug: string;
  created_at: string;
  totalPrice: number;
  status: OrderStatus;
  user_email: { email: string } | null;
  items: {
    quantity: number;
    size: string;
    product: {
      title: string;
      heroImage: string;
    };
  }[];
};

export function useAdminOrders() {
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data: ordersData, error } = await supabase
        .from('order')
        .select(`
          id,
          slug,
          created_at,
          totalPrice,
          status,
          user_email:users!order_user_id_fkey(email),
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

      if (error) throw error;

      // Transform the data to match our Order type
      return (ordersData as unknown as OrderResponse[]).map((order): Order => ({
        id: order.id,
        slug: order.slug,
        created_at: order.created_at,
        totalPrice: order.totalPrice,
        status: order.status,
        user_email: order.user_email || { email: 'Unknown' },
        items: order.items.map(item => ({
          product: {
            title: item.product.title,
            heroImage: item.product.heroImage,
          },
          size: item.size,
          quantity: item.quantity,
        })),
      }));
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number; newStatus: OrderStatus }) => {
      const { error } = await supabase
        .from('order')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      return { orderId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      Toast.show('Order status updated successfully', { type: 'success' });
    },
    onError: (error: Error) => {
      Toast.show('Error updating order status: ' + error.message, { type: 'error' });
    }
  });

  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    await updateOrderStatusMutation.mutateAsync({ orderId, newStatus });
  };

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'order' 
        }, 
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { 
    orders, 
    isLoading, 
    updateOrderStatus,
    refreshOrders: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
  };
} 