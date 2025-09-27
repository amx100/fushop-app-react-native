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
import { Link, router, Stack, useFocusEffect } from 'expo-router';
// import { format } from 'date-fns';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Tables } from '../../../types/database.types';
import { useAuth } from '../../../providers/auth-provider';
import { useOrderNotifications } from '../../../hooks/useOrderNotifications';
import { Ionicons } from '@expo/vector-icons';

type OrderStatus = 'čekanje' | 'Completed' | 'Shipped' | 'InTransit' | 'cancelled';

// Safe date formatting function
const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const month = months[date.getMonth()];
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Date error';
  }
};

// Function to get Serbian status labels
const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    'čekanje': 'NA ČEKANJU',
    'Completed': 'ZAVRŠENO',
    'Shipped': 'POSLATO',
    'InTransit': 'U TRANZITU',
    'cancelled': 'OTKAZANO',
  };
  return statusLabels[status] || status.toUpperCase();
};

type OrderWithDetails = {
  id: number;
  slug: string;
  created_at: string;
  totalPrice: number;
  status: OrderStatus;
  user_email: string;
  user: { 
    email: string;
    name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
  } | null;
  items: {
    product: {
      title: string;
      heroImage: string;
    };
    size: string;
    quantity: number;
  }[];
};

const renderItem: ListRenderItem<OrderWithDetails> = ({ item }) => {
  
  
  try {
    // Safely format the date
    const formattedDate = formatDate(item.created_at);

    // Safely format the price
    let formattedPrice = '0.00';
    try {
      if (typeof item.totalPrice === 'number' && !isNaN(item.totalPrice)) {
        formattedPrice = item.totalPrice.toFixed(2);
      }
    } catch (priceError) {
      console.error('Price formatting error:', priceError);
    }

    return (
      <Link href={`/orders/${item.slug || 'unknown'}`} asChild>
        <Pressable style={styles.orderContainer}>
          <View style={styles.orderContent}>
            <View style={styles.orderDetailsContainer}>
              <Text style={styles.orderItem}>
                #{item.id || 'N/A'} {item.slug || 'N/A'}
              </Text>           
              <Text style={styles.orderDetails}>
                Total Price: ${formattedPrice}
              </Text>
              {item.items && item.items.length > 0 && (
                <Text style={styles.orderItems}>
                  Items: {item.items.map(item => `${item.product.title} (${item.size}) x${item.quantity}`).join(', ')}
                </Text>
              )}
              <Text style={styles.orderDate}>
                {formattedDate}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#888" />
          </View>
          <View style={[styles.statusBadge, styles[`statusBadge_${item.status || 'čekanje'}`]]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status || 'čekanje')}</Text>
          </View>
        </Pressable>
      </Link>
    );
  } catch (renderError) {
    console.error('Error rendering order item:', renderError);
    console.error('Item data:', item);
    
    return (
      <View style={styles.orderContainer}>
        <Text style={styles.errorText}>Error displaying order</Text>
      </View>
    );
  }
};

const Orders = () => {
  const { session } = useAuth();
  const { unreadCount, markAllAsRead } = useOrderNotifications();
  const [orders, setOrders] = useState<OrderWithDetails[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
   
    try {
      if (!session?.user?.id) {
        
        return null;
      }

   
      const userType = session.user.user_metadata?.type;

   
      
      let query = supabase
        .from('order')
        .select(`
          id,
          slug,
          created_at,
          totalprice,
          status,
          user_id,
          user:users(email, name, last_name, phone, address, city),
          items:order_item(
            quantity,
            size,
            product:product(
              title,
              heroimage,
              price
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (userType !== 'ADMIN') {
      
        query = query.eq('user_id', session.user.id);
      }

  
      const { data, error: err } = await query;
 

      if (err) {
        console.error('Fetch orders error:', err);
        throw err;
      }

   

      const ordersWithDetails: OrderWithDetails[] = [];
      
      if (data && Array.isArray(data)) {
    
        
        for (let i = 0; i < data.length; i++) {
          const order = data[i];
       
          
          try {
            const transformedOrder: OrderWithDetails = {
              id: order.id || 0,
              slug: order.slug || `Narudžbina`,
              created_at: order.created_at || new Date().toISOString(),
              totalPrice: Number(order.totalprice) || 0,
              status: (order.status || 'čekanje') as OrderStatus,
              user_email: order.user?.email || 'N/A',
              user: order.user,
              items: order.items?.map((item: any) => ({
                product: {
                  title: item.product?.title || 'Unknown Product',
                  heroImage: item.product?.heroimage || '',
                },
                size: item.size,
                quantity: item.quantity,
              })) || [],
            };
            
         
            ordersWithDetails.push(transformedOrder);
          } catch (orderError) {
            console.error(`Error processing order ${i}:`, orderError);
            console.error('Order data:', order);
          }
        }
      } else {
        
      }

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
      // Mark notifications as read when refreshing
      markAllAsRead();
    } catch (err) {
      setError(err as Error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders, markAllAsRead]);

  useEffect(() => {
 
    
    const loadOrders = async () => {
      try {
     
        const initialOrders = await fetchOrders();
   
        
        if (initialOrders) {
  
          setOrders(initialOrders);
        }
        setIsLoading(false);
      } catch (effectError) {
        console.error('useEffect error:', effectError);
        setError(effectError as Error);
        setIsLoading(false);
      }
    };
    
    loadOrders();

   
    const channel = null;

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [session, fetchOrders]);

  // Refresh orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshOnFocus = async () => {
        try {
          const refreshedOrders = await fetchOrders();
          if (refreshedOrders) {
            setOrders(refreshedOrders);
          }
        } catch (err) {
          console.error('Error refreshing orders on focus:', err);
        }
      };
      
      refreshOnFocus();
    }, [fetchOrders])
  );

  if (!session) {
    return (
      <View style={styles.unauthenticatedContainer}>
        <Ionicons name="lock-closed" size={64} color="#888" />
        <Text style={styles.unauthenticatedSubtitle}>
          Morate biti prijavljeni da biste videli svoje porudžbine
        </Text>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/')}
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

  try {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Orders',
            headerRight: () => (
              unreadCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>{unreadCount}</Text>
                </View>
              ) : null
            )
          }} 
        />
        <FlatList
          data={orders || []}
          keyExtractor={(item) => (item?.id ? item.id.toString() : Math.random().toString())}
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
  } catch (componentError) {
    console.error('Component render error:', componentError);
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Orders' }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>
            Greška pri učitavanju porudžbina. Molimo pokušajte ponovo.
          </Text>
        </View>
      </View>
    );
  }
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
  orderItems: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
    fontStyle: 'italic',
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
  statusBadge_čekanje: {
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
  statusBadge_cancelled: {
    backgroundColor: '#dc2626',
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
  errorText: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
  },
  notificationBadge: {
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 16,
  },
  notificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
