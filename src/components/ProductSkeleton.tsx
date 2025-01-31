import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useEffect } from 'react';

export const ProductSkeleton = () => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonImage, animatedStyle]} />
      <View style={styles.textContainer}>
        <Animated.View style={[styles.skeletonTitle, animatedStyle]} />
        <Animated.View style={[styles.skeletonPrice, animatedStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonContainer: {
    width: '48%',
    backgroundColor: 'white',
    marginVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#E1E9EE',
    borderRadius: 10,
  },
  textContainer: {
    padding: 8,
    gap: 4,
  },
  skeletonTitle: {
    height: 16,
    width: '80%',
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  skeletonPrice: {
    height: 14,
    width: '40%',
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
}); 