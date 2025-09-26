import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState, useEffect } from 'react';
import { getMyOrder } from '../../../api/api';
import { supabase } from '../../../lib/supabase';
import { Tables } from '../../../types/database.types';

// Safe date formatting function
const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
    'čekanje': 'ČEKANJE',
    'Completed': 'ZAVRŠENO',
    'Shipped': 'POSLATO',
    'InTransit': 'U TRANZITU',
    'cancelled': 'OTKAZANO',
  };
  return statusLabels[status] || status.toUpperCase();
};

const OrderDetails = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: order, error, isLoading } = getMyOrder(slug || '');
  
  // Shipping options state
  const [shippingOption, setShippingOption] = useState<Tables<'shipping_options'> | null>(null);
  const [shippingLoading, setShippingLoading] = useState(true);
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Fetch shipping option for this order
  useEffect(() => {
    const fetchShippingOption = async () => {
      if (!order) {
        setShippingLoading(false);
        return;
      }

      try {
        setShippingLoading(true);
        setShippingError(null);
        
     

        if (orderData.shipping_id) {
          const { data, error } = await supabase
            .from('shipping_options')
            .select('*')
            .eq('id', orderData.shipping_id)
            .single();

          if (error) {
            console.error('Shipping option query error:', error);
            setShippingError(`Failed to load shipping option: ${error.message}`);
          } else {
            console.warn('No shipping option found for ID:', orderData.shipping_id);
            setShippingError('Shipping option not found');
          }
        } else {
          console.warn('No shipping_id found in order data');
         
        }
      } catch (error) {
        console.error('Error fetching shipping option:', error);
        setShippingError('Failed to load shipping information');
      } finally {
        setShippingLoading(false);
      }
    };

    fetchShippingOption();
  }, [order]);

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error?.message}</Text>;
  if (!order) {
    return <Text>No order details found.</Text>;
  }

  // Type assertion to handle Supabase query result
  const orderData = order as any;

  if (!orderData.items || !Array.isArray(orderData.items)) {
    return <Text>No order items found.</Text>;
  }

  const orderItems = orderData.items.map((orderItem: any, index: number) => ({
    id: orderItem.id || `order-item-${index}`,
    title: orderItem.product?.title || 'Unknown product',
    heroImage: orderItem.product?.heroimage || '',
    price: orderItem.product?.price || 0,
    quantity: orderItem.quantity || 0,
    size: orderItem.size || 'Unknown size',
  }));

  // Calculate totals with improved logic
  const subtotal = orderItems.reduce((sum: number, item: any) => {
    const itemPrice = item.price || 0;
    const itemQuantity = item.quantity || 0;
    return sum + (itemPrice * itemQuantity);
  }, 0);

  // Improved shipping cost calculation with multiple fallbacks
  const getShippingCost = () => {
    // First priority: shipping option price (if loaded successfully)
    if (shippingOption?.price !== undefined && shippingOption?.price !== null) {
      return Number(shippingOption.price);
    }
    
    // Second priority: order's stored shipping_price
    if (orderData.shipping_price !== undefined && orderData.shipping_price !== null) {
      return Number(orderData.shipping_price);
    }
    
    // Third priority: calculate from totalprice if available
    if (orderData.totalprice && subtotal > 0) {
      const calculatedShipping = Number(orderData.totalprice) - subtotal;
      if (calculatedShipping >= 0) {
        return calculatedShipping;
      }
    }
    
    // Final fallback - but this indicates a data issue
    console.warn('Unable to determine shipping cost, using 0');
    return 0;
  };

  const shippingCost = getShippingCost();
  
  // Use the stored totalprice from database (which should be authoritative)
  const total = orderData.totalprice ? Number(orderData.totalprice) : (subtotal + shippingCost);



  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `#${orderData.id} ${orderData.slug}` }} />
      
      <Text style={styles.date}>
        {formatDate(orderData.created_at)}
      </Text>
   
      <View style={[styles.statusBadge, styles[`statusBadge_${orderData.status}`]]}>
        <Text style={styles.statusText}>{getStatusLabel(orderData.status)}</Text>
      </View>
   
      {/* Ovaj deo koda je uklonjen */}
      
      <FlatList
        data={orderItems}
        keyExtractor={(item, index) => item.id?.toString() || `item-${index}`}
        renderItem={({ item }) => (
          <View style={styles.orderItem}>
            <Image
              source={{
                uri: item.heroImage || 'https://via.placeholder.com/100x100/cccccc/666666?text=No+Image'
              }}
              style={styles.heroImage}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.title}</Text>
              <Text style={styles.itemQuantity}>Količina: {item.quantity}</Text>
              <Text style={styles.itemSize}>Veličina: {item.size}</Text>
              <Text style={styles.itemPrice}>Cena: {item.price} RSD</Text>
            </View>
          </View>
        )}
      />
   
      {/* Order Summary */}
      <View style={styles.orderSummary}>
        <Text style={styles.summaryTitle}>Pregled porudžbine</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Međuzbir:</Text>
          <Text style={styles.summaryValue}>{subtotal.toFixed(2)} RSD</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Dostava:</Text>
          <Text style={[
            styles.summaryValue, 
            shippingCost === 0 ? styles.zeroShipping : null
          ]}>
            {shippingCost.toFixed(2)} RSD
          </Text>
        </View>
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Ukupno:</Text>
          <Text style={styles.totalValue}>{total.toFixed(2)} RSD</Text>
        </View>
      </View>
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
  statusBadge_cancelled: {
    backgroundColor: '#dc2626',
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
  orderSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  zeroShipping: {
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
});