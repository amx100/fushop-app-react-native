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
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

import { Tables } from '../../../types/database.types';
import { getMyOrders } from '../../../api/api';
import { useAuth } from '../../../providers/auth-provider';

const renderItem: ListRenderItem<Tables<'order'>> = ({ item }) => (
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
        <View
          style={[styles.statusBadge, styles[`statusBadge_${item.status}`]]}
        >
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
    </Pressable>
  </Link>
);

const Orders = () => {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Tables<'order'>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!session?.user?.id) return;
  
        const userType = session.user.user_metadata?.type;
        
        let query = supabase
          .from('order')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (userType !== 'ADMIN') {
          query = query.eq('user', session.user.id);
        }
  
        const { data, error: err } = await query;
  
        if (err) throw err;
        
        setOrders(data);
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    fetchOrders();

    // Set up realtime subscription with specific filters
    const channel = supabase.channel('orders-channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'order',
          filter: session?.user?.user_metadata?.type !== 'ADMIN' 
            ? `user=eq.${session?.user?.id}` 
            : undefined
        },
        (payload) => {
          // Handle all events in a single callback
          if (payload.eventType === 'INSERT') {
            setOrders(currentOrders => {
              if (!currentOrders) return [payload.new as Tables<'order'>];
              return [payload.new as Tables<'order'>, ...currentOrders];
            });
          } else if (payload.eventType === 'UPDATE') {
            setOrders(currentOrders => {
              if (!currentOrders) return currentOrders;
              return currentOrders.map(order => 
                order.id === payload.new.id ? payload.new as Tables<'order'> : order
              );
            });
          } else if (payload.eventType === 'DELETE') {
            setOrders(currentOrders => {
              if (!currentOrders) return currentOrders;
              return currentOrders.filter(order => order.id !== payload.old.id);
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  if (!session) {
    return (
      <Text
        style={{
          fontSize: 16,
          color: '#555',
          textAlign: 'center',
          padding: 10,
        }}
      >
        Please login to view your orders
      </Text>
    );
  }

  if (isLoading) return <ActivityIndicator />;

  if (error) {
    return (
      <Text
        style={{
          fontSize: 16,
          color: 'red',
          textAlign: 'center',
          padding: 10,
        }}
      >
        Error: {error.message}
      </Text>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Text
        style={{
          fontSize: 16,
          color: '#555',
          textAlign: 'center',
          padding: 10,
        }}
      >
        No orders found for your account
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Orders' }} />
      <FlatList
        data={orders}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
};

export default Orders;

const styles: { [key: string]: any } = StyleSheet.create({
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