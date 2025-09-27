import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Dimensions, 
  Animated 
} from 'react-native';
import { Product } from '../../types';
import RemoteImage from '../RemoteImage';
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type ProductListProps = {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onCreateNew: () => void;
};

const ProductCard = memo(({ product, onEdit, onDelete }: { 
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}) => {
  // Safety checks
  if (!product || !product.id) {
    return null;
  }

  const totalStock = product.sizes?.reduce((sum: number, size: any) => sum + (size.quantity || 0), 0) || 0;
  const isAvailable = product.status === 'available';

  // Animacija pritiskanja
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.productCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => onEdit(product)} 
        onPressIn={onPressIn} 
        onPressOut={onPressOut}
      >
        <View style={styles.imageContainer}>
          <RemoteImage
            path={product.heroimage}
            fallback="https://placehold.co/200x200/cccccc/666666?text=No+Image"
            style={styles.productImage}
          />
          <View style={[styles.statusBadge, isAvailable ? styles.availableBadge : styles.outOfStockBadge]}>
            <Text style={styles.statusBadgeText}>{isAvailable ? 'Dostupan' : 'Nema na stanju'}</Text>
          </View>
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.title}
          </Text>

          <View style={styles.priceAndStockRow}>
            <Text style={styles.priceValue}>{product.price.toFixed(0)} RSD</Text>
            <Text style={styles.stockValue}>Zalihe: {totalStock}</Text>
          </View>

          {product.sizes && product.sizes.length > 0 && (
            <View style={styles.sizesPreview}>
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

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => onEdit(product)}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(product.id)}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const ListHeader = memo(({ onCreateNew, products }: { 
  onCreateNew: () => void;
  products: Product[];
}) => {
  // Izračunaj statistike
  const totalProducts = products.length;
  const availableProducts = products.filter(p => p.status === 'available').length;
  const outOfStockProducts = products.filter(p => p.status === 'out_of_stock').length;
  
  // Ukupne količine po veličinama
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

  return (
    <View style={styles.headerContainer}>
  

      <TouchableOpacity onPress={onCreateNew}>
        <LinearGradient
          colors={['#ff6b35', '#ff4757']}
          style={styles.createButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add-circle-outline" size={24} color="white" />
          <Text style={styles.createButtonText}>Dodaj novi proizvod</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

const ListFooter = memo(({ isLoading }: { isLoading: boolean }) => (
  isLoading ? (
    <View style={styles.loadingFooter}>
      <ActivityIndicator size="large" color="#667eea" />
      <Text style={styles.loadingText}>Učitavanje još proizvoda...</Text>
    </View>
  ) : null
));

const EmptyState = memo(() => (
  <View style={styles.emptyState}>
    <Ionicons name="file-tray-stacked-outline" size={80} color="#dcdcdc" />
    <Text style={styles.emptyTitle}>Nema proizvoda</Text>
    <Text style={styles.emptySubtitle}>Započnite dodavanjem prvog proizvoda.</Text>
  </View>
));

const ErrorState = memo(() => (
  <View style={styles.errorState}>
    <Ionicons name="warning-outline" size={80} color="#ff6b35" />
    <Text style={styles.errorTitle}>Greška pri učitavanju</Text>
    <Text style={styles.errorSubtitle}>Pokušajte ponovo ili osvežite stranicu.</Text>
  </View>
));

export function ProductList({ products, isLoading, onEdit, onDelete, onCreateNew }: ProductListProps) {
  const renderItem = useCallback(({ item }: { item: Product }) => {
    // Safety check for each item
    if (!item || !item.id) {
      return null;
    }
    return <ProductCard product={item} onEdit={onEdit} onDelete={onDelete} />;
  }, [onEdit, onDelete]);

  const keyExtractor = useCallback((item: Product) => {
    // Safety check for key extraction
    if (!item || !item.id) {
      return `empty-${Math.random()}`;
    }
    return item.id.toString();
  }, []);

  // Safety check for products array
  const safeProducts = products?.filter(product => product && product.id) || [];

  if (isLoading && safeProducts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Učitavanje proizvoda...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={safeProducts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={2}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={<ListHeader onCreateNew={onCreateNew} products={safeProducts} />}
      ListFooterComponent={<ListFooter isLoading={isLoading} />}
      ListEmptyComponent={<EmptyState />}
      style={styles.productList}
      contentContainerStyle={styles.productListContent}
      removeClippedSubviews={true} // Enable for better performance
      initialNumToRender={12} // Show fewer items initially
      maxToRenderPerBatch={6} // Render fewer items per batch
      windowSize={10} // Standard window size
      updateCellsBatchingPeriod={50} // Faster updates
      onEndReachedThreshold={0.5} // Load more when 50% from end
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
      showsVerticalScrollIndicator={false}
      extraData={safeProducts.length} // Force re-render when data changes
    />
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  statsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  stockStatsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  stockStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    textAlign: 'center',
  },
  sizeStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  sizeStatItem: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  sizeStatText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 5,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  productList: {
    flex: 1,
    backgroundColor: 'white',
  },
  productListContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#777',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ff6b35',
    marginTop: 20,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#777',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 150,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  availableBadge: {
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },

  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    minHeight: 38,
  },
  priceAndStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  stockValue: {
    fontSize: 12,
    color: '#7f8c8d',
  },

  sizesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sizeChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emptySizeChip: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  sizeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#333',
  },
  emptySizeText: {
    color: '#ff6b35',
    textDecorationLine: 'line-through',
  },

  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  editButton: {
    backgroundColor: '#ff6b35',
  },
  deleteButton: {
    backgroundColor: '#ff4757',
  },
});
