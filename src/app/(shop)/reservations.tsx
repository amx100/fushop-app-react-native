import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { ReservationsList } from '../../components/shop/ReservationsList';
import { ReservationWithItems } from '../../api/reservations';

export default function ReservationsPage() {
  const router = useRouter();
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithItems | null>(null);
  
  console.log('ReservationsPage - component mounted');

  const handleReservationPress = (reservation: ReservationWithItems) => {
    setSelectedReservation(reservation);
    // You can implement a detailed view modal here
    Alert.alert(
      'Detalji rezervacije',
      `Datum: ${new Date(reservation.reservation_date).toLocaleDateString('sr-RS')}\nStatus: ${reservation.status}\nBroj stavki: ${reservation.reservation_items.length}`
    );
  };

  return (
    <>
   
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rezervacije</Text>
          <Text style={styles.headerSubtitle}>
            Upravljajte svojim rezervacijama proizvoda
          </Text>
        </View>

        <ReservationsList onReservationPress={handleReservationPress} />

    
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#4a90e2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
