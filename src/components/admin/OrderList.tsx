import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { format } from 'date-fns';
import { OrderStatus } from '../../types';

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

  return (
    <ScrollView style={styles.container}>
      {isLoading ? (
        <Text>Loading orders...</Text>
      ) : (
        orders?.map((order) => (
          <View key={order.id} style={styles.orderContainer}>
            <View style={styles.orderContent}>
              <View style={styles.orderDetailsContainer}>
                <Text style={styles.orderItem}>Order #{order.slug}</Text>
                <Text style={styles.orderEmail}>
                  Customer: {typeof order.user_email === 'string' ? order.user_email : order.user_email?.email || 'No Email Available'}
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
                          uri: item.product?.heroImage || 'https://via.placeholder.com/50'
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

                <View style={styles.statusButtons}>
                  {statuses.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        styles[`statusBadge_${status}`],
                        order.status === status && styles.statusButtonDisabled
                      ]}
                      disabled={order.status === status}
                      onPress={() => onUpdateStatus(order.id, status)}
                    >
                      <Text style={styles.statusButtonText}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[styles.statusBadge, styles[`statusBadge_${order.status}`]]}>
                <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        ))
      )}
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
    marginBottom: 12,
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
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
