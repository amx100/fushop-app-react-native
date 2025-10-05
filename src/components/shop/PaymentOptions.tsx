import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export type PaymentMethod = 'cash_on_delivery' | 'stripe';

interface PaymentOptionsProps {
  selectedPayment: PaymentMethod | null;
  onPaymentSelect: (method: PaymentMethod) => void;
  totalAmount: number;
  onProceedToPayment: (method: PaymentMethod) => void;
}

export function PaymentOptions({
  selectedPayment,
  onPaymentSelect,
  totalAmount,
  onProceedToPayment,
}: PaymentOptionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentProceed = async (method: PaymentMethod) => {
    if (isProcessing) return; // Prevent double clicks
    
    setIsProcessing(true);
    try {
      await onProceedToPayment(method);
    } catch (error) {
      Alert.alert(
        'Greška',
        error instanceof Error ? error.message : 'Došlo je do greške prilikom plaćanja'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Način plaćanja</Text>
      
      {/* Pouzećem opcija */}
      <TouchableOpacity
        style={[
          styles.paymentOption,
          selectedPayment === 'cash_on_delivery' && styles.paymentOptionSelected
        ]}
        onPress={() => onPaymentSelect('cash_on_delivery')}
      >
        <View style={styles.paymentOptionContent}>
          <View style={styles.paymentOptionInfo}>
            <View style={styles.paymentIconContainer}>
              <Ionicons 
                name="cash-outline" 
                size={24} 
                color={selectedPayment === 'cash_on_delivery' ? '#ff6b35' : '#666'} 
              />
            </View>
            <View style={styles.paymentTextContainer}>
              <Text style={[
                styles.paymentMethodName,
                selectedPayment === 'cash_on_delivery' && styles.paymentMethodNameSelected
              ]}>
                Pouzećem
              </Text>
              <Text style={styles.paymentMethodDescription}>
                Plaćanje prilikom preuzimanja pošiljke
              </Text>
            </View>
          </View>
          <View style={[
            styles.radioButton,
            selectedPayment === 'cash_on_delivery' && styles.radioButtonSelected
          ]}>
            {selectedPayment === 'cash_on_delivery' && (
              <View style={styles.radioButtonInner} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Stripe opcija */}
      <TouchableOpacity
        style={[
          styles.paymentOption,
          selectedPayment === 'stripe' && styles.paymentOptionSelected
        ]}
        onPress={() => onPaymentSelect('stripe')}
      >
        <View style={styles.paymentOptionContent}>
          <View style={styles.paymentOptionInfo}>
            <View style={styles.paymentIconContainer}>
              <Ionicons 
                name="card-outline" 
                size={24} 
                color={selectedPayment === 'stripe' ? '#ff6b35' : '#666'} 
              />
            </View>
            <View style={styles.paymentTextContainer}>
              <Text style={[
                styles.paymentMethodName,
                selectedPayment === 'stripe' && styles.paymentMethodNameSelected
              ]}>
                Karticom
              </Text>
              <Text style={styles.paymentMethodDescription}>
                Visa, Mastercard, American Express
              </Text>
            </View>
          </View>
          <View style={[
            styles.radioButton,
            selectedPayment === 'stripe' && styles.radioButtonSelected
          ]}>
            {selectedPayment === 'stripe' && (
              <View style={styles.radioButtonInner} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Proceed to Payment Button */}
      {selectedPayment && (
        <TouchableOpacity
          style={styles.proceedButton}
          onPress={() => handlePaymentProceed(selectedPayment)}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={isProcessing ? ['#9ca3af', '#6b7280'] : ['#ff6b35', '#ff4757']}
            style={styles.proceedGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.proceedContent}>
              <Ionicons 
                name={isProcessing ? "hourglass-outline" : "arrow-forward"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.proceedText}>
                {isProcessing 
                  ? 'Obrađuje se...' 
                  : selectedPayment === 'cash_on_delivery' 
                    ? `Završi porudžbinu (${totalAmount.toFixed(2)} RSD)`
                    : `Plati karticom (${totalAmount.toFixed(2)} RSD)`
                }
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  paymentOptionSelected: {
    borderColor: '#ff6b35',
    backgroundColor: '#fff5f2',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  paymentOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentTextContainer: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  paymentMethodNameSelected: {
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#666',
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
  proceedButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  proceedGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  proceedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
