import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { ReservationWithItems } from '../../api/reservations';
import { useQueryClient } from '@tanstack/react-query';

interface ReservationsManagementProps {
  onClose?: () => void;
}

export const ReservationsManagement: React.FC<ReservationsManagementProps> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [reservations, setReservations] = useState<ReservationWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  

  const fetchReservations = async () => {
   
    setLoading(true);
    try {
      // Check current user
      const { data: { user } } = await supabase.auth.getUser();
     
      
      // Check if user is admin by type
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('type')
        .eq('id', user?.id || '')
        .single();
      
      const isAdmin = userData?.type === 'ADMIN' || userData?.type === 'admin';

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          reservation_items (
            *,
            product:product_id (*),
            sizes:size_id (*)
          ),
          users!reservations_user_id_fkey (
            id,
            name,
            last_name,
            email
          )
        `)
        .order('reservation_date', { ascending: true });

   

      if (error) {
        console.error('Error fetching reservations:', error);
        Alert.alert('Greška', 'Greška pri učitavanju rezervacija');
        return;
      }

     
      setReservations(data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      Alert.alert('Greška', 'Greška pri učitavanju rezervacija');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const handleConfirmReservation = async (reservationId: number) => {
    Alert.alert(
      'Potvrdi i procesuiraj rezervaciju',
      'Da li želite da potvrdite i odmah procesuirate ovu rezervaciju? Ovo će kreirati narudžbinu.',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Potvrdi i procesuiraj',
          onPress: async () => {
            try {
              
              // Pozovi Supabase funkciju za procesiranje rezervacije
              const { data, error } = await supabase.functions.invoke('process-reservations', {
                body: { reservation_id: reservationId }
              });

              if (error) {
                console.error('❌ Error processing reservation:', error);
                Alert.alert('Greška', 'Greška pri procesiranju rezervacije');
                return;
              }

              Alert.alert('Uspešno', 'Rezervacija je potvrđena i procesuirana. Narudžbina je kreirana.');
              fetchReservations();
              // Refresh dashboard data when reservation is processed (creates new order)
              queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
              queryClient.invalidateQueries({ queryKey: ['admin-products'] });
              queryClient.invalidateQueries({ queryKey: ['categories'] });
            } catch (error) {
              console.error('❌ Error processing reservation:', error);
              Alert.alert('Greška', 'Greška pri procesiranju rezervacije');
            }
          }
        }
      ]
    );
  };

  const handleCancelReservation = async (reservationId: number) => {
    Alert.alert(
      'Otkaži rezervaciju',
      'Da li ste sigurni da želite da otkažete ovu rezervaciju?',
      [
        { text: 'Ne', style: 'cancel' },
        {
          text: 'Da, otkaži',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('reservations')
                .update({ status: 'cancelled' })
                .eq('id', reservationId);

              if (error) {
                Alert.alert('Greška', 'Greška pri otkazivanju rezervacije');
                return;
              }

              Alert.alert('Uspešno', 'Rezervacija je otkazana');
              fetchReservations();
              // Refresh dashboard data when reservation is cancelled
              queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
              queryClient.invalidateQueries({ queryKey: ['admin-products'] });
              queryClient.invalidateQueries({ queryKey: ['categories'] });
            } catch (error) {
              console.error('Error cancelling reservation:', error);
              Alert.alert('Greška', 'Greška pri otkazivanju rezervacije');
            }
          }
        }
      ]
    );
  };


  const processReservations = async () => {
    Alert.alert(
      'Procesiraj rezervacije',
      'Da li želite da procesirate sve rezervacije za današnji dan?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Procesiraj',
          onPress: async () => {
            try {
              
              // Get today's date
              const today = new Date().toISOString().split('T')[0];
              
              // Get pending reservations for today
              const { data: reservations, error: fetchError } = await supabase
                .from('reservations')
                .select('*')
                .eq('reservation_date', today)
                .eq('status', 'pending');
              
              if (fetchError) {
                console.error('Error fetching reservations:', fetchError);
                Alert.alert('Greška', 'Greška pri učitavanju rezervacija');
                return;
              }
              
              
              if (!reservations || reservations.length === 0) {
                Alert.alert('Info', 'Nema rezervacija za procesiranje danas');
                return;
              }
              
              // Process each reservation
              let processed = 0;
              let errors = 0;
              
              for (const reservation of reservations) {
                try {
                  
                  // Create order from reservation using RPC
                  const { data: orderId, error: rpcError } = await supabase.rpc('create_order_from_reservation', {
                    reservation_id_param: reservation.id
                  });
                  
                  if (rpcError) {
                    console.error('Error creating order for reservation:', reservation.id, rpcError);
                    errors++;
                  } else {
                    processed++;
                  }
                } catch (error) {
                  console.error('Error processing reservation:', reservation.id, error);
                  errors++;
                }
              }
              
              Alert.alert(
                'Uspešno',
                `Procesirano: ${processed}, Greške: ${errors}`
              );
              
              await fetchReservations();
              // Refresh dashboard data when all reservations are processed (creates new orders)
              queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
              queryClient.invalidateQueries({ queryKey: ['admin-products'] });
              queryClient.invalidateQueries({ queryKey: ['categories'] });
            } catch (error) {
              console.error('Error processing reservations:', error);
              Alert.alert('Greška', 'Greška pri procesiranju rezervacija');
            }
          }
        }
      ]
    );
  };

  const cancelUnconfirmed = async () => {
    Alert.alert(
      'Otkaži nepotvrđene',
      'Da li želite da otkažete sve nepotvrđene rezervacije starije od 24h?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Otkaži rezervacije',
          onPress: async () => {
            try {
              
              // Use RPC function to cancel unconfirmed reservations
              const { data: cancelledCount, error: rpcError } = await supabase.rpc('cancel_unconfirmed_reservations');
              
              if (rpcError) {
                console.error('Error cancelling reservations:', rpcError);
                Alert.alert('Greška', 'Greška pri otkazivanju rezervacija');
                return;
              }

              
              Alert.alert(
                'Uspešno',
                `Otkazano rezervacija: ${cancelledCount || 0}`
              );
              
              await fetchReservations();
            } catch (error) {
              console.error('Error cancelling reservations:', error);
              Alert.alert('Greška', 'Greška pri otkazivanju rezervacija');
            }
          }
        }
      ]
    );
  };

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

  useEffect(() => {
    fetchReservations();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Učitavanje rezervacija...</Text>
      </View>
    );
  }

  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upravljanje rezervacijama</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={processReservations}>
          <Ionicons name="play" size={20} color="#4a90e2" />
          <Text style={styles.actionButtonText}>Procesiraj rezervacije</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={cancelUnconfirmed}>
          <Ionicons name="close-circle" size={20} color="#f44336" />
          <Text style={styles.actionButtonText}>Otkaži nepotvrđene</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {reservations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Nema rezervacija</Text>
            <Text style={styles.emptyText}>
              Rezervacije će se prikazati ovde kada budu kreirane.
            </Text>
          </View>
        ) : (
          reservations.map((reservation) => (
            <View key={reservation.id} style={styles.reservationCard}>
              <View style={styles.reservationHeader}>
                <View style={styles.reservationInfo}>
                  <Text style={styles.reservationDate}>
                    {formatDate(reservation.reservation_date)}
                  </Text>
                  <Text style={styles.userInfo}>
                    {reservation.users?.name || ''} {reservation.users?.last_name || ''}
                  </Text>
                  <Text style={styles.userEmail}>
                    {reservation.users?.email || 'N/A'}
                  </Text>
                  <Text style={styles.reservationId}>Rezervacija #{reservation.id}</Text>
                </View>
                
                <View style={styles.statusContainer}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(reservation.status) }
                  ]}>
                    <Text style={styles.statusText}>
                      {getStatusText(reservation.status)}
                    </Text>
                  </View>
                  <Text style={styles.totalPrice}>
                    {calculateTotalPrice(reservation.reservation_items)} RSD
                  </Text>
                </View>
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

              {reservation.order_id && (
                <Text style={styles.orderInfo}>
                  Porudžbina ID: {reservation.order_id}
                </Text>
              )}

              {/* Admin Actions */}
              <View style={styles.adminActionsContainer}>
                {reservation.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => handleConfirmReservation(reservation.id)}
                    >
                      <Ionicons name="checkmark" size={16} color="#4caf50" />
                      <Text style={styles.confirmButtonText}>Potvrdi i procesuiraj</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelReservation(reservation.id)}
                    >
                      <Ionicons name="close" size={16} color="#f44336" />
                      <Text style={styles.cancelButtonText}>Otkaži</Text>
                    </TouchableOpacity>
                  </>
                )}

                {reservation.status === 'confirmed' && (
                  <Text style={styles.confirmedText}>
                    Rezervacija je potvrđena i procesuirana
                  </Text>
                )}

                {reservation.status === 'cancelled' && (
                  <Text style={styles.cancelledText}>
                    Rezervacija je otkazana
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  content: {
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
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
  },
  reservationId: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  totalPrice: {
    fontSize: 14,
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
  orderInfo: {
    fontSize: 12,
    color: '#4a90e2',
    fontWeight: '600',
  },
  // Admin Actions Styles
  adminActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
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
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  processButtonText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  cancelledText: {
    fontSize: 12,
    color: '#f44336',
    fontStyle: 'italic',
  },
  confirmedText: {
    fontSize: 12,
    color: '#4caf50',
    fontStyle: 'italic',
    fontWeight: '500',
  },
});
