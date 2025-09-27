import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReservations } from '../../hooks/useReservations';
import { ReservationWithItems } from '../../api/reservations';

interface ReservationsListProps {
  onReservationPress?: (reservation: ReservationWithItems) => void;
}

export const ReservationsList: React.FC<ReservationsListProps> = ({ onReservationPress }) => {
  const { reservations, loading, cancelReservation, confirmReservation, fetchReservations } = useReservations();
  
  console.log('ReservationsList - reservations:', reservations);
  console.log('ReservationsList - loading:', loading);
  
  // Force refresh on mount
  React.useEffect(() => {
    console.log('ReservationsList - force refresh on mount');
    fetchReservations();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#ffa726';
      case 'confirmed':
        return '#4caf50';
      case 'cancelled':
        return '#f44336';
      case 'expired':
        return '#9e9e9e';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Na čekanju';
      case 'confirmed':
        return 'Potvrđena';
      case 'cancelled':
        return 'Otkazana';
      case 'expired':
        return 'Istekla';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time';
      case 'confirmed':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      case 'expired':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const handleCancelReservation = (reservationId: number) => {
    Alert.alert(
      'Otkaži rezervaciju',
      'Da li ste sigurni da želite da otkažete ovu rezervaciju?',
      [
        { text: 'Ne', style: 'cancel' },
        {
          text: 'Da, otkaži',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelReservation(reservationId);
            if (!result.success) {
              Alert.alert('Greška', result.error || 'Greška pri otkazivanju rezervacije');
            }
          }
        }
      ]
    );
  };

  const handleConfirmReservation = (reservationId: number) => {
    Alert.alert(
      'Potvrdi rezervaciju',
      'Da li želite da potvrdite ovu rezervaciju i kreirate porudžbinu?',
      [
        { text: 'Ne', style: 'cancel' },
        {
          text: 'Da, potvrdi',
          onPress: async () => {
            const result = await confirmReservation(reservationId);
            if (!result.success) {
              Alert.alert('Greška', result.error || 'Greška pri potvrđivanju rezervacije');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateTotalPrice = (items: any[]) => {
    return items.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  };

  if (loading) {
    console.log('ReservationsList - showing loading state');
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Učitavanje rezervacija...</Text>
      </View>
    );
  }

  if (reservations.length === 0) {
    console.log('ReservationsList - showing empty state');
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Nema rezervacija</Text>
        <Text style={styles.emptyText}>
          Kada kreirate rezervaciju, ona će se prikazati ovde.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {reservations.map((reservation) => (
        <TouchableOpacity
          key={reservation.id}
          style={styles.reservationCard}
          onPress={() => onReservationPress?.(reservation)}
        >
          <View style={styles.reservationHeader}>
            <View style={styles.reservationInfo}>
              <Text style={styles.reservationDate}>
                {formatDate(reservation.reservation_date)}
              </Text>
              <View style={styles.statusContainer}>
                <Ionicons
                  name={getStatusIcon(reservation.status)}
                  size={16}
                  color={getStatusColor(reservation.status)}
                />
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(reservation.status) }
                ]}>
                  {getStatusText(reservation.status)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.totalPrice}>
              {calculateTotalPrice(reservation.reservation_items)} RSD
            </Text>
          </View>

          <View style={styles.itemsContainer}>
            {reservation.reservation_items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.product.title}</Text>
                <Text style={styles.itemDetails}>
                  {item.sizes.value} x {item.quantity}
                </Text>
              </View>
            ))}
          </View>

          {reservation.notes && (
            <Text style={styles.notes}>{reservation.notes}</Text>
          )}

          <View style={styles.actionsContainer}>
            {reservation.status === 'confirmed' && reservation.order_id && (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => handleConfirmReservation(reservation.id)}
              >
                <Ionicons name="checkmark" size={16} color="#4caf50" />
                <Text style={styles.confirmButtonText}>Potvrdi porudžbinu</Text>
              </TouchableOpacity>
            )}

           

            {reservation.status === 'pending' && (
              <Text style={styles.infoText}>
                Rezervacija je na čekanju administratora
              </Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  reservationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reservationInfo: {
    flex: 1,
  },
  reservationDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a90e2',
  },
  itemsContainer: {
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
  notes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  cancelButtonText: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  confirmButtonText: {
    color: '#4caf50',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  waitingText: {
    fontSize: 12,
    color: '#ffa726',
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
