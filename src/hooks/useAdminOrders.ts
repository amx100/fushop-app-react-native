import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { OrderStatus } from '../types';
import { Toast } from 'react-native-toast-notifications';

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
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
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
              heroimage
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (ordersData) {
        const formattedOrders: Order[] = ordersData.map((order) => ({
          id: order.id,
          slug: order.slug,
          created_at: order.created_at,
          totalPrice: order.totalprice,
          status: order.status as OrderStatus,
          user_email: order.user_email,
          items: order.items.map((item: any) => ({
            product: {
              title: item.product?.title || 'Unknown Product',
              heroImage: item.product?.heroimage || '',
            },
            size: item.size,
            quantity: item.quantity,
          })),
        }));
        
        return formattedOrders;
      }
      
      return [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false, // Don't refetch on mount if data is fresh
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
    onMutate: async ({ orderId, newStatus }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-orders'] });

      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData(['admin-orders']);

      // Optimistically update to the new value
      queryClient.setQueryData(['admin-orders'], (old: Order[] | undefined) => {
        if (!old) return [];
        return old.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        );
      });

      return { previousOrders };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['admin-orders'], context?.previousOrders);
      Toast.show('Error updating order status', { type: 'error' });
    },
    onSuccess: () => {
      Toast.show('Order status updated successfully', { type: 'success' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });

  const updateOrderStatus = (orderId: number, newStatus: OrderStatus) => {
    updateOrderStatusMutation.mutate({ orderId, newStatus });
  };

  // Set up real-time subscription
  // useEffect(() => {
  //   const channel = supabase
  //     .channel('orders-changes')
  //     .on('postgres_changes', 
  //       { 
  //         event: '*', 
  //         schema: 'public', 
  //         table: 'order' 
  //       }, 
  //       () => {
  //         queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  //       }
  //     )
  //     .subscribe();

  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, [queryClient]);

  return { 
    orders, 
    isLoading, 
    updateOrderStatus,
    refreshOrders: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
  };
}