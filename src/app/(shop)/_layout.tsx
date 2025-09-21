import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../providers/auth-provider';
import { CartProvider } from '../../contexts/CartContext';
import { LinearGradient } from 'expo-linear-gradient';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} {...props} style={{ color: '#fb9b3c' }} />;
}

const TabsLayout = () => {
  const { session, isLoading: authLoading } = useAuth();

  if (authLoading) return <ActivityIndicator />;

  return (
    <CartProvider>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Tabs
          screenOptions={{
            tabBarBackground: () => (
              <LinearGradient
                colors={['#1e1e1e', 'rgb(28,28,28)']}
                style={{ flex: 1 }}
              />
            ),
            tabBarActiveTintColor: 'white',
            tabBarInactiveTintColor: 'gray',
            tabBarLabelStyle: { fontSize: 16 },
            tabBarStyle: {
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 10,
            },
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name='index'
            options={{
              title: 'Proizvodi',
              tabBarIcon(props) {
                return <TabBarIcon {...props} name='shopping-cart' />;
              },
            }}
          />
          <Tabs.Screen
            name='orders'
            options={{
              title: 'Porudžbine',
              tabBarIcon(props) {
                return <TabBarIcon {...props} name='book' />;
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
});
