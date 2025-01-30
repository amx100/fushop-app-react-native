import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
} from 'react-native';
import { useCartStore } from '../store/cart-store';
import { createOrder, createOrderItem } from '../api/api';
import { useAuth } from '../providers/auth-provider';
import { CartItem, SizeType } from '../types';

type CartItemProps = {
  item: CartItem;
  onRemove: (id: number | string, size: SizeType) => void;
  onIncrement: (id: number | string, size: SizeType) => void;
  onDecrement: (id: number | string, size: SizeType) => void;

};

const CartItemComponent = ({
  item,
  onDecrement,
  onIncrement,
  onRemove,
}: CartItemProps) => {
  if (!item?.id) return null;

  return (
    <View style={styles.cartItem}>
      <Image source={{ uri: item.heroImage }} style={styles.itemImage} />
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemPrice}>${(item.price || 0).toFixed(2)}</Text>
        <Text style={styles.itemSize}>Size: {item.size}</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            onPress={() => onDecrement(item.id, item.size)}
            style={styles.quantityButton}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.itemQuantity}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() => onIncrement(item.id, item.size)}
            style={styles.quantityButton}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => onRemove(item.id, item.size)}
        style={styles.removeButton}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function Cart() {
  const {
    items,
    removeItem,
    incrementItem,
    decrementItem,
    getTotalPrice,
    resetCart,
  } = useCartStore();

  const { session, user, mounting } = useAuth();
  const { mutateAsync: createSupabaseOrder } = createOrder();
  const { mutateAsync: createSupabaseOrderItem } = createOrderItem();

  if (mounting) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} />
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyCartText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!session || !user?.id) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} />
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyCartText}>Please log in to view your cart</Text>
        </View>

      </View>
    );
  }

  const handleCheckout = async () => {
    if (!items || items.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    try {
      const totalPrice = parseFloat(getTotalPrice());
      
      const orderData = await createSupabaseOrder({ 
        totalPrice,
        items: items.map(item => ({
          id: Number(item.id),
          quantity: item.quantity,
          size: item.size
        }))
      });

      if (!orderData?.id) {
        throw new Error('Failed to create order: No order ID returned');
      }

      Alert.alert(
        'Success',
        'Order created successfully',
        [
          {
            text: 'OK',
            onPress: () => resetCart(),
          },
        ]
      );
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert(
        'Error',
        error instanceof Error 
          ? error.message 
          : 'An error occurred while creating the order'
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} />


      <FlatList
        data={items}
        keyExtractor={item => `${item.id}-${item.size}`}
        renderItem={({ item }) => (
          <CartItemComponent
            item={item}
            onRemove={removeItem}
            onIncrement={incrementItem}
            onDecrement={decrementItem}
          />
        )}
        contentContainerStyle={styles.cartList}
        ListEmptyComponent={() => (
          <Text style={styles.emptyCartText}>Your cart is empty</Text>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.totalText}>Total: ${getTotalPrice()}</Text>
        <TouchableOpacity
          onPress={handleCheckout}
          style={[
            styles.checkoutButton,
            items.length === 0 && styles.disabledButton
          ]}
          disabled={items.length === 0}
        >
          <Text style={styles.checkoutButtonText}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  cartList: {
    paddingVertical: 16,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 16,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#ff5252',
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  checkoutButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#ddd',
    marginHorizontal: 5,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyCartText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemSize: {
    fontSize: 14,
    color: '#666',
  },
});
