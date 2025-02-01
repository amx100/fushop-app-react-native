import React from 'react';
import { View } from 'react-native';
import { OrderList } from '../../../components/admin/OrderList';
import { useAdminOrders } from '../../../hooks/useAdminOrders';

export default function AdminOrdersPage() {
  const { orders, isLoading, updateOrderStatus } = useAdminOrders();

  return (
    <View style={{ flex: 1 }}>
      <OrderList 
        orders={orders}
        isLoading={isLoading}
        onUpdateStatus={updateOrderStatus}
      />
    </View>
  );
} 