import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useToast } from 'react-native-toast-notifications';
import { useState } from 'react';

import { useCartStore } from '../../store/cart-store';
import { getProduct } from '../../api/api';
import { ActivityIndicator } from 'react-native';
import { Product, ProductSize, SizeType } from '../../types';

const ProductDetails = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const toast = useToast();

  const { data: product, error, isLoading } = getProduct(slug);

  const { items, addItem, incrementItem, decrementItem } = useCartStore();

  const cartItem = items.find(item => item.id === product?.id);

  const initialQuantity = cartItem ? cartItem.quantity : 0;
  const [selectedSize, setSelectedSize] = useState<SizeType | ''>('');
  const [quantity, setQuantity] = useState(initialQuantity);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error ? error.message : 'Product not found'}
        </Text>
      </View>
    );
  }
  const getMaxQuantityForSize = (size: SizeType) => {
    const typedProduct = product as Product;
    const sizeData = typedProduct.sizes?.find(s => s.size === size);
    return sizeData?.quantity || 0;
  };

  const handleIncreaseQuantity = () => {
    if (!selectedSize) {
      toast.show('Please select a size first', {
        type: 'warning',
        placement: 'top',
        duration: 1500,
      });
      return;
    }

    const maxQuantity = getMaxQuantityForSize(selectedSize);
    if (quantity >= maxQuantity) {
      toast.show(`Only ${maxQuantity} items available in size ${selectedSize}`, {
        type: 'warning',
        placement: 'top',
        duration: 1500,
      });
      return;
    }

    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 0 && selectedSize) {
      setQuantity(prev => prev - 1);
      decrementItem(product.id, selectedSize);
    } else if (!selectedSize) {
      toast.show('Please select a size first', {
        type: 'warning',
        placement: 'top',
        duration: 1500,
      });
    }
  };

  const addToCart = () => {
    if (!selectedSize) {
      toast.show('Please select a size', {
        type: 'warning',
        placement: 'top',
        duration: 1500,
      });
      return;
    }

    const maxQuantity = getMaxQuantityForSize(selectedSize);
    if (quantity > maxQuantity) {
      toast.show(`Cannot add ${quantity} items. Only ${maxQuantity} available in size ${selectedSize}`, {
        type: 'warning',
        placement: 'top',
        duration: 1500,
      });
      return;
    }

    addItem({
      id: product.id,
      title: product.title,
      heroImage: product.heroImage,
      name: product.title,
      price: product.price,
      quantity,
      size: selectedSize,
      maxQuantity: getMaxQuantityForSize(selectedSize)
    });
    
    toast.show('Added to cart', {
      type: 'success',
      placement: 'top',
      duration: 1500,
    });
  };

  const totalPrice = (product.price * quantity).toFixed(2);

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: product.title }} />

      <Image source={{ uri: product.heroImage }} style={styles.heroImage} />

      <View style={{ padding: 16, flex: 1 }}>
        <Text style={styles.title}>Title: {product.title}</Text>
        <Text style={styles.slug}>Slug: {product.slug}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            Unit Price: ${product.price.toFixed(2)}
          </Text>
          <Text style={styles.price}>Total Price: ${totalPrice}</Text>
        </View>

        <View style={styles.sizesContainer}>
          <Text style={styles.sizeTitle}>Select Size:</Text>
          <View style={styles.sizeButtons}>
            {product.sizes?.map((sizeData: ProductSize) => (
              <TouchableOpacity
                key={sizeData.size}
                style={[
                  styles.sizeButton,
                  selectedSize === sizeData.size && styles.selectedSizeButton,
                  sizeData.quantity === 0 && styles.disabledSizeButton,
                ]}
                onPress={() => {
                  if (sizeData.quantity > 0) {
                    setSelectedSize(sizeData.size);
                    setQuantity(0);
                  }
                }}
                disabled={sizeData.quantity === 0}
              >
                <Text style={[
                  styles.sizeButtonText,
                  selectedSize === sizeData.size && styles.selectedSizeText,
                  sizeData.quantity === 0 && styles.disabledSizeText,
                ]}>
                  {sizeData.size}
                </Text>
                <Text style={styles.stockText}>
                  ({sizeData.quantity} left)
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FlatList
          data={product.imagesUrl}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.image} />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imagesContainer}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.quantityButton, !selectedSize && styles.disabledButton]}
            onPress={decreaseQuantity}
            disabled={quantity <= 0 || !selectedSize}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantity}>{quantity}</Text>

          <TouchableOpacity
            style={[styles.quantityButton, !selectedSize && styles.disabledButton]}
            onPress={handleIncreaseQuantity}
            disabled={!selectedSize || quantity >= getMaxQuantityForSize(selectedSize)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.addToCartButton,
              { opacity: (quantity === 0 || !selectedSize) ? 0.5 : 1 },
            ]}
            onPress={addToCart}
            disabled={quantity === 0 || !selectedSize}
          >
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default ProductDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heroImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  slug: {
    fontSize: 18,
    color: '#555',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  price: {
    fontWeight: 'bold',
    color: '#000',
  },
  sizesContainer: {
    marginBottom: 20,
  },
  sizeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sizeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007bff',
    alignItems: 'center',
    minWidth: 60,
  },
  selectedSizeButton: {
    backgroundColor: '#007bff',
  },
  disabledSizeButton: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  sizeButtonText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  selectedSizeText: {
    color: '#fff',
  },
  disabledSizeText: {
    color: '#999',
  },
  stockText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  image: {
    width: 100,
    height: 100,
    marginRight: 8,
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  quantityButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorMessage: {
    fontSize: 18,
    color: '#f00',
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});
