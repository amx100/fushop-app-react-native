import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReservations } from '../../hooks/useReservations';
import { useCartStore } from '../../store/cart-store';
import { Product } from '../../types';

interface ReservationModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product;
  selectedSize?: string;
  selectedQuantity?: number;
}

interface CartItem {
  product_id: number;
  size_id: number;
  quantity: number;
  size_value: string;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({ visible, onClose, product, selectedSize, selectedQuantity }) => {
  const { createReservation, loading, error, checkEligibility, reservations } = useReservations();
  const { items } = useCartStore();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [existingReservations, setExistingReservations] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      // Create reservation items from selected size and quantity
      if (selectedSize && selectedQuantity && selectedQuantity > 0) {
        // Find size_id for the selected size
        const sizeData = product.sizes?.find(s => s.size === selectedSize);
        if (sizeData) {
          setCartItems([{
            product_id: product.id,
            size_id: sizeData.size_id,
            quantity: selectedQuantity,
            size_value: selectedSize
          }]);
        }
      }

      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split('T')[0]);

      // Check eligibility
      checkEligibilityAsync();
    }
  }, [visible, product, selectedSize, selectedQuantity]);

  const checkEligibilityAsync = async () => {
    const eligible = await checkEligibility();
    setIsEligible(eligible);
  };

  // Check for existing reservations when date changes
  useEffect(() => {
    if (selectedDate && reservations) {
      const existing = reservations.filter(res => 
        res.reservation_date === selectedDate && 
        res.status !== 'cancelled'
      );
      setExistingReservations(existing);
    }
  }, [selectedDate, reservations]);

  const generateDateOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      options.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('sr-RS', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      });
    }
    
    return options;
  };

  const handleCreateReservation = async () => {
    if (!selectedDate) {
      Alert.alert('Greška', 'Molimo odaberite datum rezervacije');
      return;
    }
    
    if (!selectedSize || !selectedQuantity || selectedQuantity <= 0) {
      Alert.alert('Greška', 'Molimo odaberite veličinu i količinu proizvoda');
      return;
    }
    
    if (cartItems.length === 0) {
      Alert.alert('Greška', 'Nema proizvoda za rezervaciju');
      return;
    }

    const result = await createReservation({
      reservation_date: selectedDate,
      items: cartItems,
      notes: `Rezervacija za ${product.title}`
    });

    if (result.success) {
      Alert.alert(
        'Uspešno!', 
        'Vaša rezervacija je kreirana. Na odabrani datum će se automatski kreirati porudžbina.',
        [{ text: 'OK', onPress: onClose }]
      );
    } else {
      Alert.alert('Greška', result.error || 'Greška pri kreiranju rezervacije');
    }
  };

  if (!isEligible) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Rezervacija proizvoda</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.content}>
              <View style={styles.warningContainer}>
                <Ionicons name="warning" size={48} color="#ff6b6b" />
                <Text style={styles.warningTitle}>Niste kvalifikovani za rezervacije</Text>
                <Text style={styles.warningText}>
                  Da biste mogli da rezervišete proizvode, morate imati najmanje 5 uspešnih porudžbina.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Rezervacija proizvoda</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content}>
            <View style={styles.productInfo}>
              <Text style={styles.productTitle}>{product.title}</Text>
              <Text style={styles.productPrice}>{product.price} RSD</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Odaberite datum rezervacije</Text>
              {generateDateOptions().map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dateOption,
                    selectedDate === option.value && styles.selectedDateOption
                  ]}
                  onPress={() => setSelectedDate(option.value)}
                >
                  <Text style={[
                    styles.dateText,
                    selectedDate === option.value && styles.selectedDateText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Proizvodi za rezervaciju</Text>
              {cartItems.map((item, index) => (
                <View key={index} style={styles.cartItem}>
                  <Text style={styles.cartItemText}>
                    Veličina: {item.size_value} x {item.quantity}
                  </Text>
                </View>
              ))}
            </View>

            {/* Show existing reservations for selected date */}
            {existingReservations.length > 0 && (
              <View style={styles.existingReservationsContainer}>
                <Text style={styles.existingReservationsTitle}>
                  Postojeće rezervacije za {selectedDate}:
                </Text>
                {existingReservations.map((reservation, index) => (
                  <View key={reservation.id} style={styles.existingReservation}>
                    <Text style={styles.existingReservationText}>
                      • {reservation.reservation_items?.map((item: any) => 
                        `${item.product?.title} (${item.sizes?.value}) x${item.quantity}`
                      ).join(', ')}
                    </Text>
                    <Text style={styles.existingReservationStatus}>
                      Status: {reservation.status}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#4a90e2" />
              <Text style={styles.infoText}>
                Na odabrani datum će se automatski kreirati porudžbina. Imate 24 sata da je potvrdite.
                {existingReservations.length > 0 && ' Možete imati više rezervacija za isti dan.'}
              </Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Otkaži</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, loading && styles.disabledButton]}
              onPress={handleCreateReservation}
              disabled={loading}
            >
              <Text style={styles.confirmButtonText}>
                {loading ? 'Kreiranje...' : 'Kreiraj rezervaciju'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  productInfo: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    color: '#4a90e2',
    fontWeight: '600',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  dateOption: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  selectedDateOption: {
    borderColor: '#4a90e2',
    backgroundColor: '#e3f2fd',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  selectedDateText: {
    color: '#4a90e2',
    fontWeight: '600',
  },
  cartItem: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  cartItemText: {
    fontSize: 14,
    color: '#333',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#4a90e2',
    marginLeft: 10,
    flex: 1,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  warningContainer: {
    alignItems: 'center',
    padding: 30,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 15,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#4a90e2',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  existingReservationsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  existingReservationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  existingReservation: {
    marginBottom: 8,
  },
  existingReservationText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  existingReservationStatus: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});
