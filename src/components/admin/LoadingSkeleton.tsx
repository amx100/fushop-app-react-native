import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const SkeletonItem = ({ width = '100%', height = 20, borderRadius = 4 }: { 
  width?: string | number; 
  height?: number; 
  borderRadius?: number; 
}) => {
  const animatedValue = new Animated.Value(0);

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeletonItem,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
      ]}
    />
  );
};

export const ProductListSkeleton = () => (
  <View style={styles.container}>
    {[...Array(6)].map((_, index) => (
      <View key={index} style={styles.productCard}>
        <SkeletonItem width="100%" height={80} borderRadius={8} />
        <View style={styles.productInfo}>
          <SkeletonItem width="80%" height={16} />
          <SkeletonItem width="60%" height={14} />
          <SkeletonItem width="40%" height={12} />
        </View>
        <View style={styles.productActions}>
          <SkeletonItem width={60} height={30} borderRadius={4} />
          <SkeletonItem width={60} height={30} borderRadius={4} />
        </View>
      </View>
    ))}
  </View>
);

export const OrderListSkeleton = () => (
  <View style={styles.container}>
    {[...Array(5)].map((_, index) => (
      <View key={index} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <SkeletonItem width="30%" height={16} />
          <SkeletonItem width={80} height={24} borderRadius={12} />
        </View>
        <SkeletonItem width="60%" height={14} />
        <SkeletonItem width="40%" height={14} />
        <View style={styles.orderItems}>
          <SkeletonItem width={40} height={40} borderRadius={20} />
          <View style={styles.orderItemInfo}>
            <SkeletonItem width="70%" height={12} />
            <SkeletonItem width="50%" height={10} />
          </View>
        </View>
      </View>
    ))}
  </View>
);

export const CategoryListSkeleton = () => (
  <View style={styles.container}>
    {[...Array(4)].map((_, index) => (
      <View key={index} style={styles.categoryCard}>
        <SkeletonItem width={50} height={50} borderRadius={25} />
        <View style={styles.categoryInfo}>
          <SkeletonItem width="70%" height={16} />
          <SkeletonItem width="50%" height={14} />
        </View>
        <View style={styles.categoryActions}>
          <SkeletonItem width={50} height={30} borderRadius={4} />
          <SkeletonItem width={50} height={30} borderRadius={4} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  skeletonItem: {
    backgroundColor: '#e1e8ed',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    marginTop: 12,
    gap: 8,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderItems: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  orderItemInfo: {
    flex: 1,
    gap: 4,
  },
  categoryCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 16,
    gap: 8,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
});
