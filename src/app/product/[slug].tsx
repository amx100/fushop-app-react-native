import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useToast } from 'react-native-toast-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useCartStore } from '../../store/cart-store';
import { getProduct } from '../../api/api';
import { ProductSize, SizeType } from '../../types';
import { useAuth } from '../../providers/auth-provider';
import { ReservationModal } from '../../components/shop/ReservationModal';
import { useReservations } from '../../hooks/useReservations';

const { width, height } = Dimensions.get('window');

const ProductDetails = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const toast = useToast();
  const { data: product, error, isLoading } = getProduct(slug);
  const { items, addItem } = useCartStore();
  const router = useRouter();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [selectedSize, setSelectedSize] = useState<SizeType | ''>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [showReservationModal, setShowReservationModal] = useState<boolean>(false);
  
  const { checkEligibility } = useReservations();

  const existingCartQuantity = useMemo(() => {
    if (!product || !selectedSize) return 0;
    const found = items.find(
      item => item.id === product.id && item.size === selectedSize
    );
    return found ? found.quantity : 0;
  }, [items, product, selectedSize]);

  const totalPrice = useMemo(() => {
    return product ? (product.price * quantity).toFixed(2) : '0.00';
  }, [product, quantity]);

  const handleIncreaseQuantity = useCallback(() => {
    if (!selectedSize) {
      toast.show('Izaberite veličinu', { type: 'warning' });
      return;
    }
    const sizeData = product?.sizes?.find((s: ProductSize) => s.size === selectedSize);
    if (!sizeData || existingCartQuantity + quantity >= sizeData.quantity) {
      toast.show('Dodali ste maksimalnu količinu', { type: 'warning' });
      return;
    }
    setQuantity(prev => prev + 1);
  }, [selectedSize, product, quantity, toast, existingCartQuantity]);

  const handleDecreaseQuantity = useCallback(() => {
    if (quantity > 0) setQuantity(prev => prev - 1);
  }, [quantity]);

  const handleAddToCart = useCallback(() => {
    if (!session) {
      toast.show('Prijavite se za dodavanje u korpu', { type: 'warning' });
      router.push('/auth');
      return;
    }
    if (!selectedSize) {
      toast.show('Izaberite veličinu', { type: 'warning' });
      return;
    }
    if (quantity === 0) {
      toast.show('Izaberite količinu', { type: 'warning' });
      return;
    }

    const sizeData = product?.sizes?.find((s: ProductSize) => s.size === selectedSize);
    if (!sizeData || sizeData.quantity === 0) {
      toast.show('Veličina nije dostupna', { type: 'warning' });
      return;
    }

    addItem({
      id: product?.id || 0,
      title: product?.title || '',
      heroImage: product?.heroimage || '',
      name: product?.title || '',
      price: product?.price || 0,
      quantity,
      size: selectedSize,
      size_id: sizeData.size_id,
      maxQuantity: sizeData.quantity,
    });

    toast.show('Dodato u korpu', { type: 'success' });
    setQuantity(0);
  }, [session, selectedSize, product, quantity, addItem, toast, router]);

  const handleReservationPress = async () => {
    if (!session) {
      toast.show('Prijavite se za rezervaciju', { type: 'warning' });
      router.push('/auth');
      return;
    }
    
    if (!selectedSize) {
      toast.show('Izaberite veličinu proizvoda', { type: 'warning' });
      return;
    }
    
    if (quantity === 0) {
      toast.show('Izaberite količinu proizvoda', { type: 'warning' });
      return;
    }
    
    const isEligible = await checkEligibility();
    if (!isEligible) {
      toast.show('Morate imati najmanje 5 porudžbina za rezervaciju', { type: 'warning' });
      return;
    }
    
    setShowReservationModal(true);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff6b35" />
        <Text style={styles.loading}>Učitavanje...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.error}>{error ? error.message : 'Proizvod nije pronađen'}</Text>
      </View>
    );
  }

  const isOutOfStock = product.status === 'out_of_stock';
  const images = [product.heroimage, ...(product.imagesurl || [])];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Stack.Screen options={{ title: '', headerTransparent: true }} />

      {/* Status Bar Background */}
      <View style={[styles.statusBarBackground, { height: insets.top }]} />

      {/* Hero Gallery */}
      <View style={styles.heroContainer}>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `img-${index}`}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.heroImage} />
          )}
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.card} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>{product.price.toFixed(2)} RSD</Text>

        {/* Sizes */}
        {!isOutOfStock && product.sizes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Veličine</Text>
            <View style={styles.sizes}>
              {product.sizes.map(size => {
                const selected = selectedSize === size.size;
                const disabled = size.quantity === 0;
                return (
                  <TouchableOpacity
                    key={size.size}
                    style={[styles.sizeBtn, selected && styles.sizeSelected, disabled && styles.sizeDisabled]}
                    onPress={() => {
                      if (!disabled) {
                        setSelectedSize(size.size as SizeType);
                        setQuantity(0);
                      }
                    }}
                  >
                    <Text style={[styles.sizeText, selected && styles.sizeTextSelected]}>{size.size}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Quantity */}
        {!isOutOfStock && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Količina</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={handleDecreaseQuantity}>
                <Ionicons name="remove" size={18} color="#ff6b35" />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={handleIncreaseQuantity}>
                <Ionicons name="add" size={18} color="#ff6b35" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Add to Cart */}
        {!isOutOfStock ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cartBtn}
              onPress={handleAddToCart}
              disabled={!selectedSize || quantity === 0}
            >
              <LinearGradient
                colors={(!selectedSize || quantity === 0) ? ['#ccc', '#ccc'] : ['#ff6b35', '#ff4757']}
                style={styles.cartGradient}
              >
                <Text style={styles.cartText}>
                  {!session ? 'Prijavite se' : `Dodaj za ${totalPrice} RSD`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.reservationBtn}
              onPress={handleReservationPress}
            >
              <Ionicons name="calendar-outline" size={20} color="#ff6b35" />
              <Text style={styles.reservationText}>Rezerviši</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.outCard}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.outText}>Ovaj proizvod trenutno nije dostupan</Text>
          </View>
        )}
      </ScrollView>
      
      {/* Reservation Modal */}
      {product && (
        <ReservationModal
          visible={showReservationModal}
          onClose={() => setShowReservationModal(false)}
          product={product as any}
          selectedSize={selectedSize}
          selectedQuantity={quantity}
        />
      )}
    </View>
  );
};

export default React.memo(ProductDetails);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { marginTop: 12, fontSize: 16, color: '#999' },
  error: { marginTop: 12, fontSize: 16, color: '#FF3B30', textAlign: 'center' },

  statusBarBackground: {
    backgroundColor: '#fff',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },

  heroContainer: {
    height: height * 0.5,
  },
  heroImage: { 
    width, 
    height: height * 0.5, 
    resizeMode: 'cover' 
  },

  card: {
    marginTop: -24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 4,
  },

  title: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 8 },
  price: { fontSize: 22, fontWeight: '600', color: '#ff6b35', marginBottom: 20 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },

  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  sizeSelected: { borderColor: '#ff6b35', backgroundColor: '#fff5f0' },
  sizeDisabled: { opacity: 0.4 },
  sizeText: { fontSize: 14, fontWeight: '500', color: '#333' },
  sizeTextSelected: { color: '#ff6b35' },

  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { fontSize: 18, fontWeight: '600', color: '#333' },

  actionButtons: { 
    flexDirection: 'row', 
    gap: 10, 
    marginTop: 10 
  },
  cartBtn: { 
    flex: 1,
    borderRadius: 24, 
    overflow: 'hidden' 
  },
  cartGradient: { paddingVertical: 16, alignItems: 'center' },
  cartText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  reservationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ff6b35',
    backgroundColor: '#fff5f0',
  },
  reservationText: {
    color: '#ff6b35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  outCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  outText: { fontSize: 14, color: '#721c24', fontWeight: '600' },
});
