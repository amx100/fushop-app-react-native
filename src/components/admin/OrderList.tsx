import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  LayoutAnimation,
  UIManager,
  Platform
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

export function OrderList({ orders, isLoading, onUpdateStatus }: OrderListProps) {
  const statuses: OrderStatus[] = ['Pending', 'Completed', 'Shipped', 'InTransit'];

  // Group statuses into rows (2 per row)
  const statusRows: OrderStatus[][] = [];
  for (let i = 0; i < statuses.length; i += 2) {
    statusRows.push(statuses.slice(i, i + 2));
  }

  // Function to change status with animation
  const handleStatusChange = (orderId: number, status: OrderStatus) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onUpdateStatus(orderId, status);
    Toast.show('Status changed', { type: 'success', duration: 2000 });
  };

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

  return (
    <ScrollView style={styles.container}>
      {orders.map((order) => (
        <View key={order.id} style={styles.orderContainer}>
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
                {order.items?.map((item, index) => (
                  <View key={index} style={styles.orderItemRow}>
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

              <View style={styles.statusButtonsContainer}>
                {statusRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.statusRow}>
                    {row.map((status) => (
                      <Pressable
                        key={status}
                        style={[
                          styles.statusButton,
                          // Apply status-specific color for the button
                          styles[`statusButton_${status}`]
                        ]}
                        onPress={() => handleStatusChange(order.id, status)}
                        android_ripple={{ color: 'transparent' }}
                      >
                        <Text style={styles.statusButtonText} numberOfLines={1}>
                          {status.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                    {row.length < 2 && <View style={styles.statusButton} />}
                  </View>
                ))}
              </View>
            </View>
            {/* Use dynamic style lookup for the badge */}
            <View style={[styles.statusBadge, styles[`statusBadge_${order.status}`]]}>
              <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

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
  statusButtonsContainer: {
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusButton: {
    width: '48%',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#fff',
  },
  // Status-specific button styles
  statusButton_Pending: {
    backgroundColor: '#0A2463',
  },
  statusButton_Completed: {
    backgroundColor: '#7EB77F',
  },
  statusButton_Shipped: {
    backgroundColor: '#02C3BD',
  },
  statusButton_InTransit: {
    backgroundColor: '#ff9800',
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
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff', // Default text color (can be overridden if needed)
  },
  // Status-specific badge styles
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
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});
