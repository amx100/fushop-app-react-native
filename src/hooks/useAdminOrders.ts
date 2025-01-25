import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Order, OrderStatus } from '../types';
import { Toast } from 'react-native-toast-notifications';
export function useAdminOrders() {


  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
  });

  const updateOrderStatus = async (orderId: number, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('order')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      Toast.show('Order status updated successfully', { type: 'success' });
    } catch (error) {
      Toast.show('Error updating order status: ' + (error as Error).message, {
        type: 'error'
      });
    }
  };

  return {
    orders,
    isLoading,
    updateOrderStatus
  };
} 