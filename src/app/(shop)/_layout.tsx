import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, View, Text, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/auth-provider';
import { CartProvider } from '../../contexts/CartContext';
import { useCartStore } from '../../store/cart-store';
import { useOrderNotifications } from '../../hooks/useOrderNotifications';
import { useEffect, useRef } from 'react';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused: boolean;
  badgeCount?: number;
  badgeColor?: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (props.focused) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [props.focused]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.iconContainer}>
      <Animated.View
        style={[
          styles.iconWrapper,
          {
            transform: [
              { scale: scaleAnim },
              { rotate: rotate },
            ],
          },
        ]}
      >
        <Ionicons size={24} name={props.name} color={props.color} />
      </Animated.View>
      {/* Badge temporarily disabled for debugging */}
    </View>
  );
}

const TabsLayout = () => {
  const { session, isLoading: authLoading } = useAuth();
  const { items: cartItems } = useCartStore();
  const { unreadCount } = useOrderNotifications();

  if (authLoading) return <ActivityIndicator />;

  // Calculate cart items count
  const cartItemsCount = cartItems?.reduce((total, item) => total + item.quantity, 0) || 0;

  return (
    <CartProvider>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#ff6b35',
            tabBarInactiveTintColor: '#8e8e93',
            tabBarLabelStyle: { 
              fontSize: 11, 
              fontWeight: '600',
              marginTop: 2,
            },
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopWidth: 0,
              paddingTop: 8,
              paddingBottom: 8,
              height: 80,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: -2,
              },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 10,
            },
            headerShown: false,
            tabBarIconStyle: {
              marginTop: 2,
            },
          }}
        >
          <Tabs.Screen
            name='index'
            options={{
              title: 'Početna',
              tabBarIcon(props) {
                return (
                  <TabBarIcon 
                    {...props} 
                    name={props.focused ? 'home' : 'home-outline'} 
                  />
                );
              },
            }}
          />
          <Tabs.Screen
            name='orders'
            options={{
              title: 'Porudžbine',
              tabBarIcon(props) {
                return (
                  <TabBarIcon 
                    {...props} 
                    name={props.focused ? 'receipt' : 'receipt-outline'} 
                    badgeCount={unreadCount || 0}
                    badgeColor="#ff4757"
                  />
                );
              },
            }}
          />
          <Tabs.Screen
            name='cart'
            options={{
              title: 'Korpa',
              tabBarIcon(props) {
                return (
                  <TabBarIcon 
                    {...props} 
                    name={props.focused ? 'bag' : 'bag-outline'} 
                    badgeCount={cartItemsCount || 0}
                    badgeColor="#ff6b35"
                  />
                );
              },
            }}
          />
          <Tabs.Screen
            name='auth'
            options={{
              title: 'Prijava',
              tabBarItemStyle: session ? { display: 'none' } : undefined,
              tabBarIcon(props) {
                return (
                  <TabBarIcon 
                    {...props} 
                    name={props.focused ? 'person' : 'person-outline'} 
                  />
                );
              },
            }}
          />
          <Tabs.Screen
            name='profile'
            options={{
              title: 'Profil',
              tabBarItemStyle: !session ? { display: 'none' } : undefined,
              tabBarIcon(props) {
                return (
                  <TabBarIcon 
                    {...props} 
                    name={props.focused ? 'person' : 'person-outline'} 
                  />
                );
              },
            }}
          />
          <Tabs.Screen
            name='edit-profile'
            options={{
              title: 'Edit Profile',
              tabBarItemStyle: { display: 'none' },
              tabBarIcon(props) {
                return (
                  <TabBarIcon 
                    {...props} 
                    name={props.focused ? 'settings' : 'settings-outline'} 
                  />
                );
              },
            }}
          />
        </Tabs>
      </SafeAreaView>
    </CartProvider>
  );
};

export default TabsLayout;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
