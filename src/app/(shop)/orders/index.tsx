import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, Stack } from 'expo-router';
import { format } from 'date-fns';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Tables } from '../../../types/database.types';
import { useAuth } from '../../../providers/auth-provider';

type OrderStatus = 'Pending' | 'Completed' | 'Shipped' | 'InTransit';
type OrderWithStatus = Tables<'order'> & { status: OrderStatus };

const renderItem: ListRenderItem<OrderWithStatus> = ({ item }) => (
  <Link href={`/orders/${item.slug}`} asChild>
    <Pressable style={styles.orderContainer}>
      <View style={styles.orderContent}>
        <View style={styles.orderDetailsContainer}>
          <Text style={styles.orderItem}>{item.slug}</Text>
          <Text style={styles.orderDetails}>
            Total Price: ${item.totalPrice.toFixed(2)}
          </Text>
          <Text style={styles.orderDate}>
            {format(new Date(item.created_at), 'MMM dd, yyyy')}
          </Text>
        </View>
        <View style={[styles.statusBadge, styles[`statusBadge_${item.status}`]]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
    </Pressable>
  </Link>
);

const Orders = () => {
  const { session } = useAuth();
  const [orders, setOrders] = useState<OrderWithStatus[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      console.log('Fetching orders - Session:', session?.user?.id);
      if (!session?.user?.id) {
        console.warn('No user session found');
        return null;
      }

      const userType = session.user.user_metadata?.type;
      console.log('User type:', userType);

      let query = supabase
        .from('order')
        .select('*')
        .order('created_at', { ascending: false });

      if (userType !== 'ADMIN') {
        query = query.eq('user', session.user.id);
      }

      const { data, error: err } = await query;
      
      console.log('Query Results:', {
        dataLength: data?.length,
        error: err
      });

      if (err) {
        console.error('Fetch orders error:', err);
        throw err;
      }

      const ordersWithStatus: OrderWithStatus[] = data?.map((order) => ({
        ...order,
        status: (order.status || 'Pending') as OrderStatus,
      })) || [];

      return ordersWithStatus;
    } catch (err) {
      console.error('Fetch orders catch error:', err);
      setError(err as Error);
      return null;
    }
  }, [session]);

  const refreshOrders = useCallback(async () => {
    console.log('Refreshing orders');
    setRefreshing(true);
    try {
      const refreshedOrders = await fetchOrders();
      if (refreshedOrders) {
        setOrders(refreshedOrders);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Refresh orders error:', err);
      setError(err as Error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders]);

  useEffect(() => {
    console.log('Orders component mounted');
    fetchOrders().then((initialOrders) => {
      if (initialOrders) {
        setOrders(initialOrders);
        setIsLoading(false);
      }
    });

    const channel = supabase.channel('orders-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order' }, (payload) => {
        console.log('Supabase real-time event:', {
          eventType: payload.eventType,
          payload: payload
        });

        if (payload.eventType === 'INSERT') {
          console.log('Inserting new order');
          setOrders((currentOrders) => currentOrders ? [
            {
              ...payload.new as Tables<'order'>,
              status: (payload.new.status || 'Pending') as OrderStatus
            },
            ...currentOrders
          ] : []);
        } else if (payload.eventType === 'UPDATE') {
          console.log('Updating existing order');
          setOrders((currentOrders) => currentOrders ? currentOrders.map(order => 
            order.id === payload.new.id 
              ? {
                  ...payload.new as Tables<'order'>,
                  status: (payload.new.status || 'Pending') as OrderStatus
                }
              : order
          ) : []);
        } else if (payload.eventType === 'DELETE') {
          console.log('Deleting order');
          setOrders((currentOrders) => currentOrders ? currentOrders.filter(order => order.id !== payload.old.id) : []);
        }
      })
      .subscribe();

    console.log('Real-time subscription created');

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [session, fetchOrders]);

  // ... rest of the component remains the same (unchanged from original code)

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Orders' }} />
      <Pressable onPress={refreshOrders}>
        <Text style={{ fontSize: 18, color: '#007bff' }}>Refresh Orders</Text>
      </Pressable>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={refreshOrders}
      />
    </View>
  );
};

export default Orders;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  orderContainer: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  orderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDetailsContainer: {
    flex: 1,
  },
  orderItem: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  orderDetails: {
    fontSize: 14,
    color: '#555',
  },
  orderDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge_Pending: {
    backgroundColor: '#ffcc00',
  },
  statusBadge_Completed: {
    backgroundColor: '#4caf50',
  },
  statusBadge_Shipped: {
    backgroundColor: '#2196f3',
  },
  statusBadge_InTransit: {
    backgroundColor: '#ff9800',
  },
});
