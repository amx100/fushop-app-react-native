import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
  Image,
  ScrollView
} from 'react-native';
import { Product } from '../../types';
import RemoteImage from '../RemoteImage';
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type ProductListProps = {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onCreateNew: () => void;
};

// --- ProductCard Komponenta (Kompaktni Prikaz) ---
const ProductCard = memo(({ product, onEdit, onDelete }: {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}) => {
  const [imageModalVisible, setImageModalVisible] = useState(false);

  if (!product || !product.id) {
    return null;
  }

  const totalStock = product.sizes?.reduce((sum: number, size: any) => sum + (size.quantity || 0), 0) || 0;
  const isAvailable = totalStock > 0;
  const statusText = isAvailable ? 'Dostupno' : 'Rasprodato';

  // Animacija pritiskanja (malo manji efekat radi kompaktnosti)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <>
      <Animated.View style={[styles.productCard, { transform: [{ scale: scaleAnim }] }]}>
        
        {/* Leva strana: Slika i status */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setImageModalVisible(true)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={styles.compactImageContainer}
        >
          <RemoteImage
            path={product.heroimage}
            fallback="https://placehold.co/80x80/cccccc/666666?text=No+Image"
            style={styles.productImage}
          />
          <View style={[styles.compactStatusBadge, isAvailable ? styles.availableBadge : styles.outOfStockBadge]}>
            <Ionicons name={isAvailable ? "leaf-outline" : "warning-outline"} size={10} color="white" />
          </View>
        </TouchableOpacity>

        {/* Sredina: Informacije o proizvodu */}
        <View style={styles.compactProductInfo}>
          <Text style={styles.compactProductTitle} numberOfLines={1}>
            {product.title}
          </Text>

          {/* CENA I ZALIHE U ISTOM REDU */}
          <View style={styles.compactPriceStockRow}>
            <Text style={styles.compactPriceValue}>{product.price.toFixed(0)} RSD</Text>
            <Text style={styles.compactStockValue}> | Zalihe: {totalStock}</Text>
          </View>

           {/* Pregled Veličina - prikazuje sve veličine */}
           {product.sizes && product.sizes.length > 0 && (
             <View style={styles.compactSizesPreview}>
               {product.sizes.map((size, index) => (
                 <View key={size.id || index} style={[styles.sizeChip, size.quantity === 0 && styles.emptySizeChip]}>
                   <Text style={[styles.sizeText, size.quantity === 0 && styles.emptySizeText]}>
                     {size.size} ({size.quantity || 0})
                   </Text>
                 </View>
               ))}
             </View>
           )}
        </View>

        {/* Desna strana: Akcije (Vertikalno) */}
        <View style={styles.compactActionsContainer}>
          <TouchableOpacity
            style={[styles.compactActionButton, styles.editButton]}
            onPress={() => onEdit(product)}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.compactActionButton, styles.deleteButton]}
            onPress={() => onDelete(product.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Image Preview Modal - Optimizovan za brže zatvaranje */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
        hardwareAccelerated={true}
        statusBarTranslucent={false}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalCloseArea}
            activeOpacity={1}
            onPress={() => {
              // Brže zatvaranje bez delay-a
              setImageModalVisible(false);
            }}
          >
            <View style={styles.imageModalContent}>
              <TouchableOpacity
                style={styles.imageModalCloseButton}
                activeOpacity={0.7}
                onPress={() => {
                  // Direktno zatvaranje
                  setImageModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Image
                source={{ uri: product.heroimage || 'https://placehold.co/400x400/cccccc/666666?text=No+Image' }}
                style={styles.imageModalImage}
                resizeMode="contain"
                // Optimizacija za brže učitavanje
                fadeDuration={0}
                loadingIndicatorSource={undefined}
              />
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
});

// --- ListHeader Komponenta (Unapređena statistika ostaje, ali dugme je kompaktnije) ---
const ListHeader = memo(({ onCreateNew, products }: {
  onCreateNew: () => void;
  products: Product[];
}) => {
  // Izračunaj statistike (kao i pre)
  const totalProducts = products.length;
  const availableProducts = products.filter(p => {
    return p.sizes ? p.sizes.reduce((sum: number, size: { quantity?: number }) => 
      sum + (size.quantity || 0), 0) > 0 : false;
  }).length;
  const outOfStockProducts = totalProducts - availableProducts;

  const sizeStats = products.reduce((acc, product) => {
    if (product.sizes) {
      product.sizes.forEach(size => {
        const sizeName = size.size;
        if (sizeName && !acc[sizeName]) {
          acc[sizeName] = 0;
        }
        if (sizeName) {
          acc[sizeName] += size.quantity || 0;
        }
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const totalStock = Object.values(sizeStats).reduce((sum, qty) => sum + qty, 0);

  const sortedSizes = Object.entries(sizeStats)
    .sort(([sizeA], [sizeB]) => sizeA.localeCompare(sizeB))
    .map(([size, quantity]) => ({ size, quantity }));


  return (
    <View style={styles.headerContainer}>
   

      {/* Dugme za Kreiranje */}
      <TouchableOpacity onPress={onCreateNew} style={styles.compactCreateButtonWrapper}>
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.compactCreateButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={styles.compactCreateButtonText}>Dodaj novi proizvod</Text>
        </LinearGradient>
      </TouchableOpacity>
      <Text style={styles.productListTitle}>Lista Proizvoda ({totalProducts})</Text>
    </View>
  );
});

// --- Glavna Komponenta i ostali delovi (nepromenjeno) ---
const ListFooter = memo(({ isLoading }: { isLoading: boolean }) => (
  isLoading ? (
    <View style={styles.loadingFooter}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.loadingText}>Učitavanje...</Text>
    </View>
  ) : null
));

const EmptyState = memo(() => (
  <View style={styles.emptyState}>
    <Ionicons name="file-tray-stacked-outline" size={80} color="#d1d5db" />
    <Text style={styles.emptyTitle}>Nema proizvoda</Text>
    <Text style={styles.emptySubtitle}>Započnite dodavanjem prvog proizvoda.</Text>
  </View>
));

export function ProductList({ products, isLoading, onEdit, onDelete, onCreateNew }: ProductListProps) {
  const renderItem = useCallback(({ item }: { item: Product }) => {
    if (!item || !item.id) {
      return null;
    }
    return <ProductCard product={item} onEdit={onEdit} onDelete={onDelete} />;
  }, [onEdit, onDelete]);

  const keyExtractor = useCallback((item: Product) => {
    if (!item || !item.id) {
      return `empty-${Math.random()}`;
    }
    return item.id.toString();
  }, []);

  const safeProducts = products?.filter(product => product && product.id) || [];

  if (isLoading && safeProducts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Učitavanje proizvoda...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={safeProducts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={<ListHeader onCreateNew={onCreateNew} products={safeProducts} />}
      ListFooterComponent={<ListFooter isLoading={isLoading} />}
      ListEmptyComponent={<EmptyState />}
      style={styles.productList}
      contentContainerStyle={styles.productListContent}
      removeClippedSubviews={true}
      initialNumToRender={10}
      maxToRenderPerBatch={5}
      windowSize={15}
      showsVerticalScrollIndicator={false}
      extraData={safeProducts.length}
      // Optimizacija za brže skrolovanje nakon zatvaranja modala
      getItemLayout={(data, index) => ({
        length: 80, // Približna visina stavke
        offset: 80 * index,
        index,
      })}
      // Brže ažuriranje
      updateCellsBatchingPeriod={16}
      // Optimizacija za brže renderovanje
      disableVirtualization={false}
      // Brže skrolovanje
      scrollEventThrottle={16}
    />
  );
}

// --- Modifikovani Stilovi za Kompaktnost ---

const styles = StyleSheet.create({
  // --- Opšti Stilovi ---
  productList: {
    flex: 1,
    backgroundColor: '#f4f7f9',
  },
  productListContent: {
    paddingBottom: 20,
  },
  productListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7f9',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748b',
  },
  loadingFooter: {
    padding: 15,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#475569',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },

  // --- Header Stilovi ---
  headerContainer: {
    paddingTop: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12, // Malo manji radius
    padding: 12, // Smanjen padding
    marginHorizontal: 16,
    marginBottom: 12, // Smanjena margina
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statsTitle: {
    fontSize: 15, // Malo manji font
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },
  statNumber: {
    fontSize: 18, // Manji font
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10, // Manji font
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  compactCreateButtonWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  compactCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10, // Smanjen vertikalni padding
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  compactCreateButtonText: {
    color: 'white',
    fontSize: 14, // Malo manji font
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // --- ProductCard Stilovi za Kompaktnu Listu ---
  productCard: {
    flexDirection: 'row', // Glavna promena: vraćamo se na ROW
    backgroundColor: '#fff',
    borderRadius: 10, // Kompaktniji radius
    marginHorizontal: 16,
    marginBottom: 8, // Manja margina
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  compactImageContainer: {
    width: 60, // Smanjena veličina
    height: 60,
    position: 'relative',
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#f8fafc',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  compactStatusBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    padding: 3,
    borderRadius: 10,
  },
  availableBadge: {
    backgroundColor: '#10b981',
  },
  outOfStockBadge: {
    backgroundColor: '#ef4444',
  },

  compactProductInfo: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'space-between',
  },
  compactProductTitle: {
    fontSize: 15, // Manji font
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  compactPriceStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactPriceValue: {
    fontSize: 16, // Malo manji font
    fontWeight: 'bold',
    color: '#6366f1',
  },
  compactStockValue: {
    fontSize: 12, // Manji font za zalihe
    color: '#475569',
    fontWeight: '500',
  },

   // Kompaktne veličine - veće dimenzije
   compactSizesPreview: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 6,
     marginTop: 4,
   },
   sizeChip: {
     backgroundColor: '#f1f5f9',
     paddingHorizontal: 10,
     paddingVertical: 5,
     borderRadius: 8,
     borderWidth: 1,
     borderColor: '#e2e8f0',
     minWidth: 40,
     alignItems: 'center',
   },
  emptySizeChip: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
   sizeText: {
     fontSize: 11,
     fontWeight: '600',
     color: '#374151',
   },
  emptySizeText: {
    color: '#dc2626',
    // Nema linije preko, samo boja, za bolju kompaktnost
  },
   moreSizesChip: {
     backgroundColor: '#e0e7ff',
     paddingHorizontal: 10,
     paddingVertical: 5,
     borderRadius: 8,
     borderWidth: 1,
     borderColor: '#c7d2fe',
     minWidth: 40,
     alignItems: 'center',
   },
   moreSizesText: {
     fontSize: 11,
     fontWeight: '600',
     color: '#6366f1',
   },

  // Akcioni tasteri
  compactActionsContainer: {
    flexDirection: 'column', // Vertikalno slaganje dugmića
    justifyContent: 'center',
    gap: 6,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#f1f5f9',
  },
  compactActionButton: {
    padding: 6, // Manji padding
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#6366f1',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  // Nema teksta na dugmićima, samo ikona radi kompaktnosti
  
  // Image Modal Styles - Optimizovani za brže zatvaranje
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    position: 'relative',
    width: '90%',
    height: '80%',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: -40,
    right: 0,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  imageModalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});