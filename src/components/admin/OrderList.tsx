import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  LayoutAnimation,
  UIManager,
  Platform,
  FlatList,
} from 'react-native';
import { format } from 'date-fns';
import { OrderStatus } from '../../types';
import { Toast } from 'react-native-toast-notifications';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

type OrderListProps = {
  orders: Order[];
  isLoading: boolean;
  onUpdateStatus: (orderId: number, status: OrderStatus) => void;
};

// Define the static statuses outside of component render (or memoize them)
const STATUSES: OrderStatus[] = ['Pending', 'Completed', 'Shipped', 'InTransit'];

const getStatusRows = () => {
  const rows: OrderStatus[][] = [];
  for (let i = 0; i < STATUSES.length; i += 2) {
    rows.push(STATUSES.slice(i, i + 2));
  }
  return rows;
};

type OrderItemProps = {
  order: Order;
  statusRows: OrderStatus[][];
  onUpdateStatus: (orderId: number, status: OrderStatus) => void;
};

const OrderItem = React.memo(({ order, statusRows, onUpdateStatus }: OrderItemProps) => {
  // Memoize the callback to avoid re-rendering child components unnecessarily
  const handleStatusChange = useCallback(
    (status: OrderStatus) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onUpdateStatus(order.id, status);
      Toast.show('Status changed', { type: 'success', duration: 2000 });
    },
    [order.id, onUpdateStatus]
  );

  return (
    <View style={styles.orderContainer}>
      <View style={styles.orderContent}>
        <View style={styles.orderDetailsContainer}>
          <Text style={styles.orderItem}>Order #{order.slug}</Text>
          <Text style={styles.orderEmail}>
            Customer:{' '}
            {typeof order.user_email === 'string'
              ? order.user_email
              : order.user_email?.email || 'No Email Available'}
          </Text>
          <Text style={styles.orderDetails}>
            Total Price: ${order.totalPrice.toFixed(2)}
          </Text>
          <Text style={styles.orderDate}>
            {format(new Date(order.created_at), 'MMM dd, yyyy')}
          </Text>

          <View style={styles.itemsContainer}>
            {order.items?.map((item, idx) => (
              <View key={idx} style={styles.orderItemRow}>
                <Image
                  source={{
                    uri: item.product?.heroImage || 'https://via.placeholder.com/50',
                  }}
                  style={styles.productImage}
                />
                <View style={styles.itemDetails}>
                  <Text style={styles.productTitle}>
                    {item.product?.title || 'Product Name Not Available'}
                  </Text>
                  <Text style={styles.itemInfo}>
                    Size: {item.size || 'N/A'} • Qty: {item.quantity || 0}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.statusContainer}>
            {statusRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.statusRow}>
                {row.map((status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.statusBadge,
                      styles[`statusBadge_${status}` ],
                    ]}
                    onPress={() => handleStatusChange(status)}
                    android_ripple={{ color: 'transparent' }}
                  >
                    <Text style={styles.statusBadgeText} numberOfLines={1}>
                      {status.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
                {row.length < 2 && <View style={styles.statusBadge} />}
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.statusBadge, styles[`statusBadge_${order.status}` ]]}>
          <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
});

export function OrderList({ orders, isLoading, onUpdateStatus }: OrderListProps) {
  // Memoize the statusRows since STATUSES are static
  const statusRows = useMemo(() => getStatusRows(), []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>Loading orders...</Text>
      </View>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>No orders found</Text>
      </View>
    );
  }

  // Use FlatList for better performance on large lists
  return (
    <FlatList
      data={orders}
      keyExtractor={(order) => order.id.toString()}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <OrderItem order={item} statusRows={statusRows} onUpdateStatus={onUpdateStatus} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#fff',
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
    alignItems: 'flex-start',
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
  itemsContainer: {
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemInfo: {
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    marginTop: 8,
    width:'auto'
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginLeft: 8,
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
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
  statusBadge_Cancelled: {
    backgroundColor: '#ff9800',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
  },

  messageText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});
