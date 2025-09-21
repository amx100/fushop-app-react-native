import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getMyOrder } from '../../../api/api';
// Removed date-fns import due to React Native compatibility issues

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

const OrderDetails = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data: order, error, isLoading } = getMyOrder(slug || '');

  if (isLoading) return <ActivityIndicator />;

  if (error) return <Text>Error: {error?.message}</Text>;

  if (!order) {
    return <Text>No order details found.</Text>;
  }

  // Type assertion to handle Supabase query result
  const orderData = order as any;
  
  if (!orderData.order_items || !Array.isArray(orderData.order_items)) {
    return <Text>No order items found.</Text>;
  }

  const orderItems = orderData.order_items.map((orderItem: any) => ({
    id: orderItem.id,
    title: orderItem.products?.title || 'Unknown product',
    heroImage: orderItem.products?.heroimage || '',
    price: orderItem.products?.price || 0,
    quantity: orderItem.quantity || 0,
    size: orderItem.size || 'Unknown size',
  }));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `#${orderData.id} ${orderData.slug}` }} />

  
      {<Text style={styles.date}>
        {formatDate(orderData.created_at)}
      </Text>}
      <View style={[styles.statusBadge, styles[`statusBadge_${orderData.status}`]]}>
        <Text style={styles.statusText}>{orderData.status}</Text>
      </View>
      
  
      
      <FlatList
        data={orderItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.orderItem}>
            <Image 
              source={{ uri: item.heroImage || 'https://via.placeholder.com/100x100/cccccc/666666?text=No+Image' }} 
              style={styles.heroImage} 
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.title}</Text>
              <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
              <Text style={styles.itemSize}>Size: {item.size}</Text>
              <Text style={styles.itemPrice}>Price: ${item.price}</Text>
              <Text style={styles.itemTotal}>
                Total: ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

export default OrderDetails;

const styles: { [key: string]: any } = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  item: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  details: {
    fontSize: 16,
    marginBottom: 16,
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
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#555',
    marginTop: 16,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  heroImage: {
    width: '50%',
    height: 100,
    borderRadius: 10,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1BC464',
  },
});
