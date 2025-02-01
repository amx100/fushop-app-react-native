import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { Link, Stack } from 'expo-router';
import { format } from 'date-fns';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Tables } from '../../../types/database.types';
import { useAuth } from '../../../providers/auth-provider';

type OrderStatus = 'Pending' | 'Completed' | 'Shipped' | 'InTransit';
type OrderWithStatus = Tables<'order'> & { status: OrderStatus };

type OrderWithDetails = OrderWithStatus & {
  user_email: string;
  items: {
    product_title: string;
    product_image: string;
    quantity: number;
    size: string;
  }[];
};

const renderItem: ListRenderItem<OrderWithDetails> = ({ item }) => (
  <Link href={`/orders/${item.slug}`} asChild>
    <Pressable style={styles.orderContainer}>
      <View style={styles.orderContent}>
        <View style={styles.orderDetailsContainer}>
          <Text style={styles.orderItem}>Order #{item.slug}</Text>
          <Text style={styles.orderEmail}>Customer: {item.user_email}</Text>
          <Text style={styles.orderDetails}>
            Total Price: ${item.totalPrice.toFixed(2)}
          </Text>
          <Text style={styles.orderDate}>
            {format(new Date(item.created_at), 'MMM dd, yyyy')}
          </Text>
          
          <View style={styles.itemsContainer}>
            {item.items.map((orderItem, index) => (
              <View key={index} style={styles.orderItemRow}>
                <Image 
                  source={{ uri: orderItem.product_image }} 
                  style={styles.productImage}
                />
                <View style={styles.itemDetails}>
                  <Text style={styles.productTitle}>{orderItem.product_title}</Text>
                  <Text style={styles.itemInfo}>
                    Size: {orderItem.size} • Qty: {orderItem.quantity}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
  const [orders, setOrders] = useState<OrderWithDetails[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      if (!session?.user?.id) {
        console.warn('No user session found');
        return null;
      }

      const userType = session.user.user_metadata?.type;

      let query = supabase
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

      if (userType !== 'ADMIN') {
        query = query.eq('user', session.user.id);
      }

      const { data, error: err } = await query;

      if (err) {
        console.error('Fetch orders error:', err);
        throw err;
      }

      const ordersWithDetails: OrderWithDetails[] = data?.map((order) => ({
        ...order,
        status: (order.status || 'Pending') as OrderStatus,
        user_email: order.user_email?.email,
        items: order.items.map((item: any) => ({
          product_title: item.product.title,
          product_image: item.product.heroImage,
          quantity: item.quantity,
          size: item.size,
        })),
      })) || [];

      return ordersWithDetails;
    } catch (err) {
      console.error('Fetch orders catch error:', err);
      setError(err as Error);
      return null;
    }
  }, [session]);

  const refreshOrders = useCallback(async () => {
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
    fetchOrders().then((initialOrders) => {
      if (initialOrders) {
        setOrders(initialOrders);
        setIsLoading(false);
      }
    });

    const channel = supabase.channel('orders-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order' }, async (payload) => {
        // Helper function to fetch complete order details
        const fetchOrderDetails = async (orderId: number) => {
          const { data } = await supabase
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
            .eq('id', orderId)
            .single();

          if (data) {
            return {
              ...data,
              status: (data.status || 'Pending') as OrderStatus,
              user_email: data.user_email?.email,
              items: data.items.map((item: any) => ({
                product_title: item.product.title,
                product_image: item.product.heroImage,
                quantity: item.quantity,
                size: item.size,
              })),
            } as OrderWithDetails;
          }
          return null;
        };

        if (payload.eventType === 'INSERT') {
          const newOrder = await fetchOrderDetails(payload.new.id);
          if (newOrder) {
            setOrders((currentOrders) => 
              currentOrders ? [newOrder, ...currentOrders] : [newOrder]
            );
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedOrder = await fetchOrderDetails(payload.new.id);
          if (updatedOrder) {
            setOrders((currentOrders) => 
              currentOrders 
                ? currentOrders.map(order =>
                    order.id === payload.new.id ? updatedOrder : order
                  )
                : []
            );
          }
        } else if (payload.eventType === 'DELETE') {
          setOrders((currentOrders) => 
            currentOrders 
              ? currentOrders.filter(order => order.id !== payload.old.id)
              : []
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, fetchOrders]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Orders' }} />
      <Pressable
        onPress={refreshOrders}
        style={({ pressed }) => [
          styles.refreshButton,
          pressed && styles.refreshButtonPressed
        ]}
      >
        <Text style={{ color: '#007bff', fontWeight: 'bold' }}>Refresh Orders</Text>
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
  refreshButton: {
    fontSize: 18,
    color: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#e6f2ff',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: '#c4e0ff',
    shadowOpacity: 0.2,
    elevation: 2,
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
  orderEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
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
  itemsContainer: {
    marginTop: 8,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 10,
  },
  itemDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
