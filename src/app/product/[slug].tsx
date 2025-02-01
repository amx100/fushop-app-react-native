import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useToast } from 'react-native-toast-notifications';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { useCartStore } from '../../store/cart-store';
import { getProduct } from '../../api/api';
import { ActivityIndicator } from 'react-native';
import { Product, ProductSize, SizeType } from '../../types';

const { width } = Dimensions.get('window');

const ProductDetails = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const toast = useToast();

  const { data: product, error, isLoading } = getProduct(slug);
  const { items, addItem, incrementItem, decrementItem } = useCartStore();
  const cartItem = items.find(item => item.id === product?.id);
  const initialQuantity = cartItem ? cartItem.quantity : 0;
  const [selectedSize, setSelectedSize] = useState<SizeType | ''>('');
  const [quantity, setQuantity] = useState(initialQuantity);

  // Loading & Error States remain the same
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
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

  // All handler functions remain the same
  const getMaxQuantityForSize = (size: string) => {
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

    const sizeData = product.sizes?.find((s: { size: string }) => s.size === selectedSize);
    if (!sizeData) {
      toast.show('Selected size not found', {
        type: 'error',
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
      size_id: sizeData.size_id,
      maxQuantity: maxQuantity
    });
    
    toast.show('Added to cart', {
      type: 'success',
      placement: 'top',
      duration: 1500,
    });
  };

  const totalPrice = (product.price * quantity).toFixed(2);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: product.title, 
          headerTransparent: true,
          headerBlurEffect: 'light',
          headerTintColor: '#000',
          headerStyle: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
          },
          headerTitleStyle: {
            fontSize: 16,
            fontWeight: '500',
          },
          headerShadowVisible: false,
        }} 
      />

      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.heroImage }} style={styles.heroImage} />
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.9)', '#fff']}
            style={styles.imageOverlay}
          />
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.price}>
            {product.price.toFixed(2)} RSD
          </Text>

          <View style={styles.galleryContainer}>
            <FlatList
              data={product.imagesUrl}
              keyExtractor={(item, index) => `${product.id}-image-${index}`}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.thumbnailImage} />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailsContainer}
            />
          </View>

          <View style={styles.sizesContainer}>
        <Text style={styles.sectionTitle}>Izaberite veličinu</Text>
        <View style={styles.sizeButtons}>
          {product.sizes?.map((sizeData: ProductSize) => (
            <TouchableOpacity
              key={`${product.id}-${sizeData.size_id}`}
              style={[
                styles.sizeButton,
                selectedSize === sizeData.size && styles.selectedSizeButton,
                sizeData.quantity === 0 && styles.disabledSizeButton,
              ]}
              onPress={() => {
                if (sizeData.quantity > 0) {
                  setSelectedSize(sizeData.size as SizeType);
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
              <Text style={[
                styles.stockText,
                selectedSize === sizeData.size && styles.selectedStockText,
                sizeData.quantity === 0 && styles.disabledSizeText,
              ]}>
                {sizeData.quantity} na lageru
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
        </View>
      </ScrollView>

      <BlurView intensity={90} tint="light" style={styles.bottomBar}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={[styles.quantityButton, !selectedSize && styles.disabledButton]}
            onPress={decreaseQuantity}
            disabled={quantity <= 0 || !selectedSize}
          >
            <Text style={styles.quantityButtonText}>−</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantity}>{quantity}</Text>
          
          <TouchableOpacity
            style={[styles.quantityButton, !selectedSize && styles.disabledButton]}
            onPress={handleIncreaseQuantity}
            disabled={!selectedSize || quantity >= getMaxQuantityForSize(selectedSize)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.addToCartButton,
            { opacity: (quantity === 0 || !selectedSize) ? 0.5 : 1 },
          ]}
          onPress={addToCart}
          disabled={quantity === 0 || !selectedSize}
        >
          <Text style={styles.addToCartText}>Add to Cart • {totalPrice} RSD</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};

export default ProductDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    height: width * 1.2,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  detailsContainer: {
    padding: 24,
    paddingTop: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#cc783f',
    marginBottom: 24,
  },
  galleryContainer: {
    marginBottom: 32,
  },
  thumbnailsContainer: {
    gap: 12,
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  sizesContainer: {
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  sizeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sizeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    minWidth: 70,
  },
  selectedSizeButton: {
    backgroundColor: '#cc783f',
  },
  disabledSizeButton: {
    backgroundColor: '#f3f4f6',
    opacity: 0.5,
  },
  sizeButtonText: {
    color: '#663c20',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedSizeText: {
    color: '#fff',
  },
  disabledSizeText: {
    color: '#9ca3af',
  },
  stockText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  selectedStockText: {
    color: '#fff',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#e5e7eb',
  },
  quantityButtonText: {
    fontSize: 20,
    color: '#111827',
    fontWeight: '500',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    color: '#111827',
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: '#ff964f',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});