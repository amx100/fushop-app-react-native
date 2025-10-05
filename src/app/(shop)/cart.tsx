import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  SafeAreaView,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCartStore } from '../../store/cart-store';
import { createOrder } from '../../api/api';
import { useAuth } from '../../providers/auth-provider';
import { CartItem, SizeType } from '../../types';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Tables } from '../../types/database.types';
import { PaymentOptions, PaymentMethod } from '../../components/shop/PaymentOptions';
import { setupStripePaymentSheet, openStripeCheckout } from '../../lib/stripe';

type CartItemProps = {
  item: CartItem;
  onRemove: (id: number | string, size: SizeType) => void;
  onIncrement: (id: number | string, size: SizeType) => void;
  onDecrement: (id: number | string, size: SizeType) => void;

};

const CartItemComponent = ({
  item,
  onDecrement,
  onIncrement,
  onRemove,
}: CartItemProps) => {
  if (!item?.id) return null;

  return (
    <View style={styles.cartItem}>
      {/* Product Image */}
      <Image 
        source={{ uri: item.heroImage || 'https://via.placeholder.com/80x80/cccccc/666666?text=No+Image' }} 
        style={styles.itemImage} 
      />
      
      {/* Product Details */}
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSize}>Size: {item.size}</Text>
        <Text style={styles.itemPrice}>{(item.price || 0).toFixed(2)} RSD</Text>
        
        {/* Quantity Controls */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            onPress={() => onDecrement(item.id, item.size as SizeType)}
            style={styles.quantityButton}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.itemQuantity}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() => onIncrement(item.id, item.size as SizeType)}
            style={styles.quantityButtonPlus}
          >
            <Text style={styles.quantityButtonTextPlus}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Remove Button */}
      <TouchableOpacity
        onPress={() => onRemove(item.id, item.size as SizeType)}
        style={styles.removeButton}
      >
        <Ionicons name="trash-outline" size={20} color="#ff6b35" />
      </TouchableOpacity>
    </View>
  );
};

export default function Cart() {
  const {
    items,
    removeItem,
    incrementItem,
    decrementItem,
    getTotalPrice,
    resetCart,
  } = useCartStore();

  const { session, user, mounting } = useAuth();
  const { mutateAsync: createSupabaseOrder } = createOrder();
  
  // State for user profile completeness
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  
  // State for checkout form
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Serbia'
  });
  const [useExistingData, setUseExistingData] = useState(true);
  
  // Payment method state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // Animation for empty state
  const [emptyStateAnimation] = useState(new Animated.Value(0));

  // Shipping options state
  const [selectedShipping, setSelectedShipping] = useState<number | null>(null);
  const [shippingOptions, setShippingOptions] = useState<Tables<'shipping_options'>[]>([]);
  const [shippingLoading, setShippingLoading] = useState(true);

  // Function to check profile completeness
  const checkProfileCompleteness = async () => {
    if (!session?.user?.id) {
      setProfileComplete(null);
      return;
    }

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('name, last_name, phone, address, city, postal_code')
        .eq('id', session.user.id)
        .single();

      if (error) {
        setProfileComplete(false);
        return;
      }

      const isComplete = !!(
        userData?.name?.trim() &&
        userData?.last_name?.trim() &&
        userData?.phone?.trim() &&
        userData?.address?.trim() &&
        userData?.city?.trim() &&
        userData?.postal_code?.trim()
      );

      setProfileComplete(isComplete);
      
      // Populate checkout data with existing user data
      if (userData) {
        setCheckoutData({
          name: userData.name || '',
          last_name: userData.last_name || '',
          phone: userData.phone || '',
          address: userData.address || '',
          city: userData.city || '',
          postal_code: userData.postal_code || '',
          country: 'Serbia'
        });
      }
    } catch (error) {
      setProfileComplete(false);
    }
  };

  // Check profile completeness on mount
  useEffect(() => {
    checkProfileCompleteness();
  }, [session?.user?.id]);

  // Check profile completeness when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkProfileCompleteness();
    }, [session?.user?.id])
  );

  // Animate empty state when cart is empty
  useEffect(() => {
    if (items.length === 0) {
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(emptyStateAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      emptyStateAnimation.setValue(0);
    }
  }, [items.length, emptyStateAnimation]);

  // Fetch shipping options
  useEffect(() => {
    const fetchShippingOptions = async () => {
      try {
        setShippingLoading(true);
        const { data, error } = await supabase
          .from('shipping_options')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (error) throw error;

        setShippingOptions(data || []);
        // Set first option as default if available
        if (data && data.length > 0) {
          setSelectedShipping(data[0].id);
        }
      } catch (error) {
      } finally {
        setShippingLoading(false);
      }
    };

    fetchShippingOptions();
  }, []);

  // Calculate totals
  const subtotal = parseFloat(getTotalPrice());
  const shippingCost = shippingOptions.find(option => option.id === selectedShipping)?.price || 0;
  const total = subtotal + shippingCost;

  if (mounting) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} />
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="hourglass-outline" size={64} color="#888" />
          </View>
          <Text style={styles.emptyCartTitle}>Učitavanje...</Text>
          <Text style={styles.emptyCartSubtitle}>
            Molimo sačekajte dok se podaci učitavaju
          </Text>
        </View>
      </View>
    );
  }

  if (!session || !user?.id) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} />
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="lock-closed" size={64} color="#888" />
          </View>
          <Text style={styles.emptyCartTitle}>Morate biti prijavljeni</Text>
          <Text style={styles.emptyCartSubtitle}>
            Prijavite se da biste videli svoju korpu i nastavili sa kupovinom
          </Text>
          <TouchableOpacity 
            style={styles.shopNowButton}
            onPress={() => router.push('/profile')}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.shopNowGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="log-in-outline" size={20} color="white" />
              <Text style={styles.shopNowText}>Prijavite se</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCheckout = async () => {
    if (!items || items.length === 0) {
      Alert.alert('Greška', 'Vaša korpa je prazna');
      return;
    }

    // If profile is not complete, show checkout form
    if (profileComplete === false) {
      setShowCheckoutForm(true);
      return;
    }

    // If no payment method selected, show payment options
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      // Save user data if it was entered in checkout form
      if (!useExistingData && session?.user?.id) {
        await supabase
          .from('users')
          .upsert({
            id: session.user.id,
            email: session.user.email || '',
            name: checkoutData.name,
            last_name: checkoutData.last_name,
            phone: checkoutData.phone,
            address: checkoutData.address,
            city: checkoutData.city,
            postal_code: checkoutData.postal_code,
            country: checkoutData.country,
          });
      }

      const orderData = await createSupabaseOrder({ 
        totalPrice: total,
        items: items.map(item => ({
          id: Number(item.id),
          quantity: item.quantity,
          size: item.size,
          size_id: item.size_id
        })),
        paymentMethod: selectedPaymentMethod
      } as any);

      if (!orderData?.id) {
        throw new Error('Failed to create order: No order ID returned');
      }

      Alert.alert(
        'Uspešno',
        'Porudžbina je uspešno kreirana',
        [
          {
            text: 'OK',
            onPress: () => {
              resetCart();
              setShowCheckoutForm(false);
              setSelectedPaymentMethod(null);
              // Redirect to orders page to show the new order
              router.push('/(shop)/orders');
            },
          },
        ]
      );
    } catch (error) {
      
      Alert.alert(
        'Greška',
        error instanceof Error 
          ? error.message 
          : 'Došlo je do greške prilikom kreiranja porudžbine'
      );
    }
  };

  const handlePaymentProceed = async (method: PaymentMethod) => {
    if (method === 'stripe') {
      try {
        // Setup Stripe payment sheet
        await setupStripePaymentSheet(total);
        
        // Open Stripe checkout
        const result = await openStripeCheckout();
        
        if (result === 'cancelled') {
          // User cancelled payment - show friendly message and reset payment method
          Alert.alert(
            'Plaćanje otkazano',
            'Možete nastaviti sa kupovinom ili odabrati drugi način plaćanja.',
            [
              {
                text: 'OK',
                style: 'default',
                onPress: () => {
                  // Reset payment method selection to allow user to choose again
                  setSelectedPaymentMethod(null);
                },
              },
            ]
          );
          return;
        }
        
        if (result === true) {
          // Payment successful - proceed with order creation
          await handleCheckout();
        }
      } catch (error) {
        // Don't throw error for network issues, just show alert
        if (error instanceof Error && error.message.includes('Network')) {
          Alert.alert(
            'Network greška',
            'Plaćanje je možda uspešno, ali došlo je do network greške. Proverite svoju porudžbinu u sekciji "Moje porudžbine".',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Reset payment method to allow retry
                  setSelectedPaymentMethod(null);
                  // Check if order was actually created
                  router.push('/(shop)/orders');
                },
              },
            ]
          );
          return;
        }
        throw new Error('Stripe payment failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } else {
      // For cash on delivery, proceed directly
      await handleCheckout();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
  

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cart Items */}
        {items.length > 0 ? (
          <View style={styles.cartItemsContainer}>
            {items.map((item) => (
              <CartItemComponent
                key={`${item.id}-${item.size}`}
                item={item}
                onRemove={removeItem}
                onIncrement={incrementItem}
                onDecrement={decrementItem}
              />
            ))}
          </View>
        ) : (
          <Animated.View 
            style={[
              styles.emptyStateContainer,
              {
                opacity: emptyStateAnimation,
                transform: [
                  {
                    translateY: emptyStateAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View 
              style={[
                styles.emptyStateIcon,
                {
                  transform: [
                    {
                      scale: emptyStateAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="cart-outline" size={80} color="#e0e0e0" />
            </Animated.View>
            <Text style={styles.emptyCartTitle}>Vaša korpa je prazna</Text>
            <Text style={styles.emptyCartSubtitle}>
              Dodajte proizvode u korpu da biste nastavili sa kupovinom
            </Text>
            <TouchableOpacity 
              style={styles.shopNowButton}
              onPress={() => router.push('/(shop)')}
            >
              <LinearGradient
                colors={['#ff6b35', '#ff4757']}
                style={styles.shopNowGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="storefront-outline" size={20} color="white" />
                <Text style={styles.shopNowText}>Idi u prodavnicu</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Shipping Options */}
        {items.length > 0 && (
          <View style={styles.shippingContainer}>
            <Text style={styles.shippingTitle}>Opcije dostave</Text>
            {shippingLoading ? (
              <View style={styles.shippingLoading}>
                <Text style={styles.shippingLoadingText}>Učitavanje opcija dostave...</Text>
              </View>
            ) : shippingOptions.length > 0 ? (
              shippingOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.shippingOption,
                    selectedShipping === option.id && styles.shippingOptionSelected
                  ]}
                  onPress={() => setSelectedShipping(option.id)}
                >
                  <View style={styles.shippingOptionContent}>
                    <View style={styles.shippingOptionInfo}>
                      <Text style={[
                        styles.shippingOptionName,
                        selectedShipping === option.id && styles.shippingOptionNameSelected
                      ]}>
                        {option.name}
                      </Text>
                      <Text style={styles.shippingOptionDays}>
                        {option.delivery_time_min && option.delivery_time_max 
                          ? `${option.delivery_time_min}-${option.delivery_time_max} radnih dana`
                          : option.description || 'Standardna dostava'
                        }
                      </Text>
                    </View>
                    <View style={styles.shippingOptionPrice}>
                      <Text style={[
                        styles.shippingOptionPriceText,
                        selectedShipping === option.id && styles.shippingOptionPriceTextSelected
                      ]}>
                        {option.price.toFixed(2)} RSD
                      </Text>
                      <View style={[
                        styles.radioButton,
                        selectedShipping === option.id && styles.radioButtonSelected
                      ]}>
                        {selectedShipping === option.id && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.shippingError}>
                <Text style={styles.shippingErrorText}>Nema dostava dostupnih</Text>
              </View>
            )}
          </View>
        )}

        {/* Payment Options */}
        {items.length > 0 && (
          <PaymentOptions
            selectedPayment={selectedPaymentMethod}
            onPaymentSelect={setSelectedPaymentMethod}
            totalAmount={total}
            onProceedToPayment={handlePaymentProceed}
          />
        )}

        {/* Order Summary */}
        {items.length > 0 && (
          <View style={styles.orderSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Međuzbir:</Text>
              <Text style={styles.summaryValue}>{subtotal.toFixed(2)} RSD</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Dostava:</Text>
              <Text style={styles.summaryValue}>{shippingCost.toFixed(2)} RSD</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Ukupno:</Text>
              <Text style={styles.totalValue}>{total.toFixed(2)} RSD</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Profile Completeness Warning */}
      {items.length > 0 && profileComplete === false && (
        <View style={styles.profileWarning}>
          <View style={styles.warningContent}>
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <Text style={styles.warningText}>
              Molimo popunite sve podatke u profilu pre porudžbine
            </Text>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/profile')}
            >
              <Text style={styles.profileButtonText}>Popuni profil</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Checkout Button - Only show if no payment method selected */}
      {items.length > 0 && !selectedPaymentMethod && (
        <View style={styles.checkoutContainer}>
          <TouchableOpacity
            onPress={() => {
              if (profileComplete === false) {
                setShowCheckoutForm(true);
              } else {
                Alert.alert('Error', 'Please select a payment method');
              }
            }}
            style={[
              styles.checkoutButton,
              profileComplete === false && styles.checkoutButtonDisabled
            ]}
            disabled={items.length === 0 || profileComplete === false}
          >
            <LinearGradient
              colors={profileComplete === false ? ['#9ca3af', '#6b7280'] : ['#ff6b35', '#ff4757']}
              style={styles.checkoutGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.checkoutIcon}>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </View>
              <Text style={styles.checkoutButtonText}>
                {profileComplete === false ? 'Popunite podatke u profilu' : 'Izaberite način plaćanja'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Checkout Form Modal */}
      {showCheckoutForm && (
        <View style={styles.checkoutFormOverlay}>
          <View style={styles.checkoutFormContainer}>
            <View style={styles.checkoutFormHeader}>
              <Text style={styles.checkoutFormTitle}>Podaci za dostavu i plaćanje</Text>
              <TouchableOpacity
                onPress={() => setShowCheckoutForm(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.checkoutFormContent}>
              {/* Use existing data option */}
              {profileComplete === true && (
                <View style={styles.dataOptionContainer}>
                  <TouchableOpacity
                    style={styles.dataOption}
                    onPress={() => setUseExistingData(true)}
                  >
                    <View style={[styles.radioButton, useExistingData && styles.radioButtonSelected]}>
                      {useExistingData && <View style={styles.radioButtonInner} />}
                    </View>
                    <Text style={styles.dataOptionText}>Koristi postojeće podatke u profilu</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Enter new data option */}
              <View style={styles.dataOptionContainer}>
                <TouchableOpacity
                  style={styles.dataOption}
                  onPress={() => setUseExistingData(false)}
                >
                  <View style={[styles.radioButton, !useExistingData && styles.radioButtonSelected]}>
                    {!useExistingData && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={styles.dataOptionText}>Unesi nove podatke u profilu</Text>
                </TouchableOpacity>
              </View>

              {/* Form fields */}
              {!useExistingData && (
                <View style={styles.formFields}>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Ime</Text>
                      <TextInput
                        style={styles.formInput}
                        value={checkoutData.name}
                        onChangeText={(text) => setCheckoutData(prev => ({ ...prev, name: text }))}
                        placeholder="Unesite ime"
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Prezime</Text>
                      <TextInput
                        style={styles.formInput}
                        value={checkoutData.last_name}
                        onChangeText={(text) => setCheckoutData(prev => ({ ...prev, last_name: text }))}
                        placeholder="Unesite prezime"
                      />
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Broj telefona</Text>
                    <TextInput
                      style={styles.formInput}
                      value={checkoutData.phone}
                      onChangeText={(text) => setCheckoutData(prev => ({ ...prev, phone: text }))}
                      placeholder="Unesite broj telefona"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Adresa</Text>
                    <TextInput
                      style={[styles.formInput, styles.textArea]}
                      value={checkoutData.address}
                      onChangeText={(text) => setCheckoutData(prev => ({ ...prev, address: text }))}
                      placeholder="Unesite adresu"
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Grad</Text>
                      <TextInput
                        style={styles.formInput}
                        value={checkoutData.city}
                        onChangeText={(text) => setCheckoutData(prev => ({ ...prev, city: text }))}
                        placeholder="Unesite grad"
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Poštanski broj</Text>
                      <TextInput
                        style={styles.formInput}
                        value={checkoutData.postal_code}
                        onChangeText={(text) => setCheckoutData(prev => ({ ...prev, postal_code: text }))}
                        placeholder="Unesite poštanski broj"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Zemlja</Text>
                    <TextInput
                      style={styles.formInput}
                      value={checkoutData.country}
                      onChangeText={(text) => setCheckoutData(prev => ({ ...prev, country: text }))}
                      placeholder="Unesite zemlju"
                    />
                  </View>
                </View>
              )}

              {/* Checkout button */}
              <TouchableOpacity
                style={styles.finalCheckoutButton}
                onPress={handleCheckout}
              >
                <LinearGradient
                  colors={['#ff6b35', '#ff4757']}
                  style={styles.finalCheckoutGradient}
                >
                  <Text style={styles.finalCheckoutText}>Završi porudžbinu i plati</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cartItemsContainer: {
    paddingVertical: 20,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loginButton: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  quantityButtonPlus: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#ff6b35',
  },
  quantityButtonTextPlus: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  orderSummary: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  checkoutContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  checkoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  checkoutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyCartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyCartSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  shopNowButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1 }],
  },
  shopNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  shopNowText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyCartText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  shippingContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shippingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  shippingOption: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  shippingOptionSelected: {
    borderColor: '#ff6b35',
    backgroundColor: '#fff5f2',
  },
  shippingOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  shippingOptionInfo: {
    flex: 1,
  },
  shippingOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  shippingOptionNameSelected: {
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  shippingOptionDays: {
    fontSize: 14,
    color: '#666',
  },
  shippingOptionPrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shippingOptionPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 12,
  },
  shippingOptionPriceTextSelected: {
    color: '#ff6b35',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#ff6b35',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff6b35',
  },
  shippingLoading: {
    padding: 20,
    alignItems: 'center',
  },
  shippingLoadingText: {
    fontSize: 16,
    color: '#666',
  },
  shippingError: {
    padding: 20,
    alignItems: 'center',
  },
  shippingErrorText: {
    fontSize: 16,
    color: '#ff6b35',
  },
  
  // Profile warning styles
  profileWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
    padding: 12,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  profileButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  profileButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Checkout button disabled styles
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  // Checkout form styles
  checkoutFormOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  checkoutFormContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkoutFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  checkoutFormTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
  },
  checkoutFormContent: {
    padding: 20,
  },
  dataOptionContainer: {
    marginBottom: 16,
  },
  dataOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dataOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 12,
  },
  formFields: {
    marginTop: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formField: {
    flex: 1,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: 'white',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  finalCheckoutButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  finalCheckoutGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalCheckoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
