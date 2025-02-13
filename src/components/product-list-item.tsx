import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { Tables } from '../types/database.types';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const HORIZONTAL_SPACING = 20; // Padding from screen edges
const COLUMN_GAP = 2;
// Calculate item width accounting for screen padding and gap
const ITEM_WIDTH = (width - (2 * HORIZONTAL_SPACING) - COLUMN_GAP) / 2;

interface ProductListItemProps {
  product: Tables<'product'>;
}

const ProductListItemComponent = ({ product }: ProductListItemProps) => {
  const isOutOfStock = product.status === 'out_of_stock';

  return (
    <Link asChild href={`/product/${product.slug}`}>
      <Pressable style={styles.item}>
        <View style={styles.itemImageContainer}>
          <Image 
            source={{ 
              uri: product.heroImage,
              cache: 'force-cache' // Basic caching on supported platforms
            }} 
            style={[
              styles.itemImage,
              isOutOfStock && styles.outOfStockImage
            ]}
          />
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Nema na stanju</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.05)']}
            style={styles.imageOverlay}
          />
        </View>
        <View style={styles.itemTextContainer}>
          <Text 
            numberOfLines={2} 
            style={[
              styles.itemPrice, 
              isOutOfStock && styles.outOfStockPrice
            ]}
          >
            {product.price.toFixed(2)} RSD
          </Text>
          <Text 
            numberOfLines={2} 
            style={[
              styles.itemTitle, 
              isOutOfStock && styles.outOfStockTitle
            ]}
          >
            {product.title}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
};

function areEqual(prevProps: ProductListItemProps, nextProps: ProductListItemProps) {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.slug === nextProps.product.slug &&
    prevProps.product.heroImage === nextProps.product.heroImage &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.title === nextProps.product.title &&
    prevProps.product.status === nextProps.product.status
  );
}

export const ProductListItem = memo(ProductListItemComponent, areEqual);

const styles = StyleSheet.create({
  item: {
    width: ITEM_WIDTH,
    marginBottom: 24,
  },
  itemImageContainer: {
    marginTop: 20,
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  outOfStockImage: {
    opacity: 0.5,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  outOfStockText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  outOfStockPrice: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  outOfStockTitle: {
    color: '#999',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  itemTextContainer: {
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  itemTitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '400',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  itemPrice: {
    fontSize: 15,
    color: '#111',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

export default ProductListItem;
