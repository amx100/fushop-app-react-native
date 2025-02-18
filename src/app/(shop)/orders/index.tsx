import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Link, router, Stack } from 'expo-router';
import { format } from 'date-fns';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Tables } from '../../../types/database.types';
import { useAuth } from '../../../providers/auth-provider';
import { Ionicons } from '@expo/vector-icons';

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
          <Text style={styles.orderItem}>
            #{item.id} {item.slug}
          </Text>
          <Text style={styles.orderEmail}>Customer: {item.user_email}</Text>
          <Text style={styles.orderDetails}>
            Total Price: ${item.totalPrice.toFixed(2)}
          </Text>
          <Text style={styles.orderDate}>
            {format(new Date(item.created_at), 'MMM dd, yyyy')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#888" />
      </View>
      <View style={[styles.statusBadge, styles[`statusBadge_${item.status}`]]}>
        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
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

      const ordersWithDetails: OrderWithDetails[] =
        data?.map((order) => ({
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

    const channel = supabase
      .channel('orders-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order' },
        async (payload) => {
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
                  ? currentOrders.map((order) =>
                      order.id === payload.new.id ? updatedOrder : order
                    )
                  : []
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders((currentOrders) =>
              currentOrders
                ? currentOrders.filter((order) => order.id !== payload.old.id)
                : []
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, fetchOrders]);

  if (!session) {
    return (
      <View style={styles.unauthenticatedContainer}>
        <Ionicons name="lock-closed" size={64} color="#888" />
        <Text style={styles.unauthenticatedSubtitle}>
          Morate biti prijavljeni da biste videli svoje porudžbine
        </Text>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/auth')}
        >
          <Text style={styles.loginButtonText}>Prijavite se</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text>Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Orders' }} />
      <FlatList
        data={orders || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={refreshOrders}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Trenutno nemate porudžbina.
            </Text>
          </View>
        }
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
    position: 'absolute',
    top: 10,
    right: 10,
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
    backgroundColor: '#0A2463',
  },
  statusBadge_Completed: {
    backgroundColor: '#7EB77F',
  },
  statusBadge_Shipped: {
    backgroundColor: '#02C3BD',
  },
  statusBadge_InTransit: {
    backgroundColor: '#ff9800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  unauthenticatedSubtitle: {
    paddingTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
