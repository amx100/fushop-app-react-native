import { useState, useEffect } from 'react';
import { ReservationService, ReservationWithItems, CreateReservationData } from '../api/reservations';
import { useAuth } from '../providers/auth-provider';

export const useReservations = () => {
  const [reservations, setReservations] = useState<ReservationWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchReservations = async () => {
    if (!user) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await ReservationService.getUserReservations(user.id);
      setReservations(data);
    } catch (err) {
      setError('Greška pri učitavanju rezervacija');
    } finally {
      setLoading(false);
    }
  };

  const createReservation = async (reservationData: CreateReservationData) => {
    if (!user) {
      setError('Morate biti prijavljeni');
      return { success: false };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await ReservationService.createReservation(user.id, reservationData);
      
      if (result.success) {
        // Refresh reservations list
        await fetchReservations();
      } else {
        setError(result.error || 'Greška pri kreiranju rezervacije');
      }
      
      return result;
    } catch (err) {
      const errorMsg = 'Greška pri kreiranje rezervacije';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const cancelReservation = async (reservationId: number) => {
    if (!user) return { success: false };

    setLoading(true);
    setError(null);

    try {
      const result = await ReservationService.cancelReservation(reservationId, user.id);
      
      if (result.success) {
        // Refresh reservations list
        await fetchReservations();
      } else {
        setError(result.error || 'Greška pri otkazivanju rezervacije');
      }
      
      return result;
    } catch (err) {
      const errorMsg = 'Greška pri otkazivanju rezervacije';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const confirmReservation = async (reservationId: number) => {
    if (!user) return { success: false };

    setLoading(true);
    setError(null);

    try {
      const result = await ReservationService.confirmReservation(reservationId, user.id);
      
      if (result.success) {
        // Refresh reservations list
        await fetchReservations();
      } else {
        setError(result.error || 'Greška pri potvrđivanju rezervacije');
      }
      
      return result;
    } catch (err) {
      const errorMsg = 'Greška pri potvrđivanju rezervacije';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    if (!user) return false;

    try {
      return await ReservationService.checkEligibility(user.id);
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchReservations();
    } else {
      setReservations([]);
    }
  }, [user]);

  return {
    reservations,
    loading,
    error,
    fetchReservations,
    createReservation,
    cancelReservation,
    confirmReservation,
    checkEligibility
  };
};
