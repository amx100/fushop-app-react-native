import { Image, Pressable, StyleSheet, Text, View, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { Tables } from '../types/database.types';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const HORIZONTAL_SPACING = 16; // Padding from screen edges
const COLUMN_GAP = 2;
// Calculate item width accounting for screen padding and gap
const ITEM_WIDTH = (width - (2 * HORIZONTAL_SPACING) - COLUMN_GAP) / 2;

export const ProductListItem = ({
  product,
}: {
  product: Tables<'product'>;
}) => {
  return (
    <Link asChild href={`/product/${product.slug}`}>
      <Pressable style={styles.item}>
        <View style={styles.itemImageContainer}>
          <Image 
            source={{ uri: product.heroImage }} 
            style={styles.itemImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.05)']}
            style={styles.imageOverlay}
          />
        </View>
        <View style={styles.itemTextContainer}>
          <Text numberOfLines={2} style={styles.itemPrice}>
            {product.price.toFixed(2)} RSD
          </Text>
          <Text numberOfLines={2} style={styles.itemTitle}>
            {product.title}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
};

const styles = StyleSheet.create({
  item: {
    width: ITEM_WIDTH,
    marginBottom: 24,
  },
  itemImageContainer: {
    width: '100%',
    aspectRatio: 3/4,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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