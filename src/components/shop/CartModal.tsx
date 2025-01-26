import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { useCart } from '../../contexts/CartContext';
import { Product } from '../../types';

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
}



export function CartModal({ visible, onClose }: CartModalProps) {
  const { cart, removeFromCart, updateQuantity } = useCart();

  const handleRemoveItem = (product: Product | null) => {
    if (!product) return;
    removeFromCart(product);
  };

  const handleUpdateQuantity = (product: Product | null, quantity: number) => {
    if (!product) return;
    updateQuantity(product, quantity);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Cart</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={cart}
          keyExtractor={(item) => item.product?.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => (
            item.product ? (
              <View style={styles.cartItem}>
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle}>{item.product.title}</Text>
                  <Text style={styles.productPrice}>
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(item.product, Math.max(0, item.quantity - 1))}
                    style={styles.quantityButton}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>

                  <Text style={styles.quantity}>{item.quantity}</Text>

                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(item.product, item.quantity + 1)}
                    style={styles.quantityButton}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleRemoveItem(item.product)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          )}
          ListEmptyComponent={() => (
            <Text style={styles.emptyCart}>Your cart is empty</Text>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    closeButton: {
      fontSize: 16,
      color: '#666',
    },
    cartItem: {
      flexDirection: 'column',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    productInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    productTitle: {
      fontSize: 16,
      fontWeight: '500',
    },
    productPrice: {
      fontSize: 16,
      color: '#666',
    },
    quantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    quantityButton: {
      backgroundColor: '#f0f0f0',
      padding: 8,
      borderRadius: 4,
      minWidth: 35,
      alignItems: 'center',
    },
    quantityButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    quantity: {
      fontSize: 16,
      minWidth: 30,
      textAlign: 'center',
    },
    removeButton: {
      backgroundColor: '#ff4444',
      padding: 8,
      borderRadius: 4,
      marginLeft: 'auto',
    },
    removeButtonText: {
      color: '#fff',
      fontSize: 14,
    },
    emptyCart: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
      marginTop: 20,
    },
  });