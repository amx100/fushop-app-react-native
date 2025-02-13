import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useToast } from 'react-native-toast-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { useCartStore } from '../../store/cart-store';
import { getProduct } from '../../api/api';
import { Product, ProductSize, SizeType } from '../../types';

const { width, height } = Dimensions.get('window');

const ProductDetails = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const toast = useToast();
  const { data: product, error, isLoading } = getProduct(slug);
  const { items, addItem, decrementItem } = useCartStore();
  const router = useRouter();

  // Local state for selected size and the new quantity the user intends to add.
  const [selectedSize, setSelectedSize] = useState<SizeType | ''>('');
  const [quantity, setQuantity] = useState<number>(0);

  // This memo returns the maximum quantity available for a given size.
  const getMaxQuantityForSize = useCallback(
    (size: string) => {
      if (!product) return 0;
      const sizeData = product.sizes?.find((s: ProductSize) => s.size === size);
      return sizeData?.quantity || 0;
    },
    [product]
  );

  // Derive the current cart quantity for the current product & selected size.
  // (Recalculate whenever the cart items, product, or selectedSize change.)
  const existingCartQuantity = useMemo(() => {
    if (!product || !selectedSize) return 0;
    const found = items.find(
      item => item.id === product.id && item.size === selectedSize
    );
    return found ? found.quantity : 0;
  }, [items, product, selectedSize]);

  // Total price for the new quantity the user wants to add.
  const totalPrice = useMemo(() => {
    return product ? (product.price * quantity).toFixed(2) : '0.00';
  }, [product, quantity]);

  // Increase quantity callback
  const handleIncreaseQuantity = useCallback(() => {
    if (!selectedSize) {
      toast.show('Please select a size first', {
        type: 'warning',
        placement: 'top',
        duration: 1500,
      });
      return;
    }
    const maxQuantity = getMaxQuantityForSize(selectedSize);
    // Check if the new quantity plus what's already in the cart is at or exceeds the max.
    if (existingCartQuantity + quantity >= maxQuantity) {
      toast.show(
        `Dodali ste sve dostupne veličine ovog proizvoda [${selectedSize}]`,
        {
          type: 'warning',
          placement: 'top',
          duration: 1500,
        }
      );
      return;
    }
    setQuantity(prev => prev + 1);
  }, [selectedSize, quantity, getMaxQuantityForSize, toast, existingCartQuantity]);

  // Decrease quantity callback
  const handleDecreaseQuantity = useCallback(() => {
    if (!selectedSize) {
      toast.show('Please select a size first', {
        type: 'warning',
        placement: 'top',
        duration: 1500,
      });
      return;
    }
    if (quantity > 0) {
      setQuantity(prev => prev - 1);
      if (product) {
        decrementItem(product.id, selectedSize);
      }
    }
  }, [selectedSize, quantity, product, decrementItem, toast]);

  // Add to Cart callback with enhanced validation.
  const handleAddToCart = useCallback(() => {
    if (!selectedSize) {
      toast.show('Please select a size', {
        type: 'warning',
        placement: 'top',
        duration: 1500,
      });
      return;
    }
    
    // Dodatna provera statusa proizvoda i količine
    if (product.status === 'out_of_stock') {
      toast.show('Proizvod trenutno nije dostupan', {
        type: 'warning',
        placement: 'top',
        duration: 1500,
      });
      return;
    }

    const sizeData = product.sizes?.find((s: ProductSize) => s.size === selectedSize);
    
    if (!sizeData || sizeData.quantity === 0) {
      toast.show('Izabrana veličina nije dostupna', {
        type: 'warning',
        placement: 'top',
        duration: 1500,
      });
      return;
    }

    // Postojeća logika dodavanja u korpu...
    addItem({
      id: product.id,
      title: product.title,
      heroImage: product.heroImage,
      name: product.title,
      price: product.price,
      quantity,
      size: selectedSize,
      size_id: sizeData.size_id,
      maxQuantity: sizeData.quantity,
    });
    toast.show('Added to cart', {
      type: 'success',
      placement: 'top',
      duration: 1500,
    });

    // Reset the local quantity after a successful add.
    setQuantity(0);
  }, [
    selectedSize,
    product,
    quantity,
    getMaxQuantityForSize,
    addItem,
    toast,
    existingCartQuantity,
  ]);

  // Memoize the thumbnail renderItem to prevent unnecessary re-renders.
  const renderThumbnail = useCallback(
    ({ item, index }: { item: string; index: number }) => {
      return (
        <Image
          source={{ uri: item, cache: 'force-cache' }}
          style={styles.thumbnailImage}
          key={`${product?.id}-image-${index}`}
        />
      );
    },
    [product]
  );

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

  if (product && product.status === 'out_of_stock') {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: product.title,
            headerTransparent: true,
            headerTintColor: '#000',
          }}
        />

        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          <View style={styles.heroContainer}>
            <ImageBackground
              source={{
                uri: product.heroImage,
                cache: 'force-cache',
              }}
              style={styles.heroImage}
              resizeMode="cover"
            >
              <View style={styles.outOfStockOverlay}>
                <Text style={styles.outOfStockText}>Nema na stanju</Text>
              </View>
              <LinearGradient
                colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.6)']}
                style={styles.gradientOverlay}
              />
            </ImageBackground>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>{product.title}</Text>
            <Text style={styles.cardPrice}>{product.price.toFixed(2)} RSD</Text>

            <View style={styles.outOfStockMessageContainer}>
              <Text style={styles.outOfStockDetailsMessage}>
                Trenutno nema dostupnih artikala ove veličine.
              </Text>
            </View>

            <View style={styles.galleryContainer}>
              <FlatList
                data={product.imagesUrl}
                keyExtractor={(item, index) => `${product.id}-image-${index}`}
                renderItem={renderThumbnail}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailsContainer}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

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
        {/* Full Hero Image Section */}
        <ImageBackground
          source={{
            uri: product.heroImage,
            cache: 'force-cache', // Added cache policy similar to ProductListItem
          }}
          style={styles.heroContainer}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.6)']}
            style={styles.gradientOverlay}
          />
        </ImageBackground>

        {/* Details Card - overlapping the hero image */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>{product.title}</Text>
          <Text style={styles.cardPrice}>{product.price.toFixed(2)} RSD</Text>

          <View style={styles.galleryContainer}>
            <FlatList
              data={product.imagesUrl}
              keyExtractor={(item, index) => `${product.id}-image-${index}`}
              renderItem={renderThumbnail}
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
                  key={sizeData.size}
                  style={[
                    styles.sizeButton,
                    selectedSize === sizeData.size && styles.selectedSizeButton,
                    (sizeData.quantity === 0 || product.status === 'out_of_stock') && styles.disabledSizeButton
                  ]}
                  onPress={() => {
                    // Allow selection only if there is quantity
                    if (sizeData.quantity > 0 && product.status !== 'out_of_stock') {
                      setSelectedSize(sizeData.size as SizeType);
                    }
                  }}
                  disabled={sizeData.quantity === 0 || product.status === 'out_of_stock'}
                >
                  <Text
                    style={[
                      styles.sizeButtonText,
                      selectedSize === sizeData.size && styles.selectedSizeText,
                      (sizeData.quantity === 0 || product.status === 'out_of_stock') && styles.disabledSizeText
                    ]}
                  >
                    {sizeData.size} 
                    {sizeData.quantity === 0 && ' (Nema)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {product.status !== 'out_of_stock' && (
        <BlurView intensity={90} tint="light" style={styles.bottomBar}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[styles.quantityButton, !selectedSize && styles.disabledButton]}
              onPress={handleDecreaseQuantity}
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
              { 
                opacity: (
                  quantity === 0 || 
                  !selectedSize || 
                  product.status === 'out_of_stock' || 
                  product.sizes?.find((s: ProductSize) => s.size === selectedSize)?.quantity === 0
                ) ? 0.5 : 1 
              },
            ]}
            onPress={handleAddToCart}
            disabled={
              quantity === 0 || 
              !selectedSize || 
              product.status === 'out_of_stock' || 
              product.sizes?.find((s: ProductSize) => s.size === selectedSize)?.quantity === 0
            }
          >
            <Text style={styles.addToCartText}>
              {product.status === 'out_of_stock' 
                ? 'Nije dostupno' 
                : `Add to Cart • ${totalPrice} RSD`}
            </Text>
          </TouchableOpacity>
        </BlurView>
      )}
    </View>
  );
};

export default React.memo(ProductDetails);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heroContainer: {
    width: '100%',
    height: height * 0.5,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 100,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  cardPrice: {
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
    marginBottom: 24,
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
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
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
    fontSize: 17,
    fontWeight: '500',
  },
  selectedSizeText: {
    color: '#fff',
  },
  disabledSizeText: {
    color: '#9ca3af',
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
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
  outOfStockMessageContainer: {
    backgroundColor: '#f8d7da',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  outOfStockDetailsMessage: {
    color: '#721c24',
    textAlign: 'center',
    fontSize: 16,
  },
  heroImage: {
    width: '100%',
    height: height * 0.5,
  },
});
