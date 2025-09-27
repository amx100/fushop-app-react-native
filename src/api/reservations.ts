import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type Reservation = Database['public']['Tables']['reservations']['Row'];
type ReservationInsert = Database['public']['Tables']['reservations']['Insert'];
type ReservationItem = Database['public']['Tables']['reservation_items']['Row'];
type ReservationItemInsert = Database['public']['Tables']['reservation_items']['Insert'];

export interface ReservationWithItems extends Reservation {
  reservation_items: (ReservationItem & {
    product: Database['public']['Tables']['product']['Row'];
    sizes: Database['public']['Tables']['sizes']['Row'];
  })[];
  users?: {
    id: string;
    name: string | null;
    last_name: string | null;
    email: string;
  };
}

export interface CreateReservationData {
  reservation_date: string;
  items: {
    product_id: number;
    size_id: number;
    quantity: number;
  }[];
  notes?: string;
}

export class ReservationService {
  // Check if user is eligible for reservations (5+ orders)
  static async checkEligibility(userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('user_has_5_plus_orders', {
      user_uuid: userId
    });
    
    if (error) {
      console.error('Error checking eligibility:', error);
      return false;
    }
    
    return data || false;
  }

  // Create a new reservation
  static async createReservation(
    userId: string, 
    reservationData: CreateReservationData
  ): Promise<{ success: boolean; reservationId?: number; error?: string }> {
    try {
      // Check eligibility first
      const isEligible = await this.checkEligibility(userId);
      if (!isEligible) {
        return { 
          success: false, 
          error: 'Morate imati najmanje 5 porudžbina da biste mogli da rezervišete proizvode' 
        };
      }

      // Validate reservation date (must be within 7 days)
      const reservationDate = new Date(reservationData.reservation_date);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 7);

      if (reservationDate < today || reservationDate > maxDate) {
        return {
          success: false,
          error: 'Datum rezervacije mora biti u narednih 7 dana'
        };
      }

      // Note: Removed restriction - users can now have multiple reservations for the same date
      // This allows different products and different sizes of the same product

      // Create reservation
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          user_id: userId,
          reservation_date: reservationData.reservation_date,
          status: 'pending',
          notes: reservationData.notes,
          expires_at: new Date(reservationDate.getTime() + 24 * 60 * 60 * 1000).toISOString() // 24h after reservation date
        })
        .select('id')
        .single();

      if (reservationError) {
        return { success: false, error: reservationError.message };
      }

      // Create reservation items
      const reservationItems = reservationData.items.map(item => ({
        reservation_id: reservation.id,
        product_id: item.product_id,
        size_id: item.size_id,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('reservation_items')
        .insert(reservationItems);

      if (itemsError) {
        // Clean up reservation if items creation fails
        await supabase.from('reservations').delete().eq('id', reservation.id);
        return { success: false, error: itemsError.message };
      }

      return { success: true, reservationId: reservation.id };
    } catch (error) {
      console.error('Error creating reservation:', error);
      return { success: false, error: 'Greška pri kreiranju rezervacije' };
    }
  }

  // Get user's reservations
  static async getUserReservations(userId: string): Promise<ReservationWithItems[]> {
    console.log('getUserReservations called with userId:', userId);
    
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        reservation_items (
          *,
          product:product_id (*),
          sizes:size_id (*)
        )
      `)
      .eq('user_id', userId)
      .order('reservation_date', { ascending: true });

    console.log('Supabase query result:', { data, error });

    if (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }

    console.log('Returning reservations:', data || []);
    return data || [];
  }

  // Get reservation by ID
  static async getReservationById(reservationId: number, userId: string): Promise<ReservationWithItems | null> {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        reservation_items (
          *,
          product:product_id (*),
          sizes:size_id (*)
        )
      `)
      .eq('id', reservationId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching reservation:', error);
      return null;
    }

    return data;
  }

  // Cancel reservation
  static async cancelReservation(reservationId: number, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', reservationId)
        .eq('user_id', userId)
        .in('status', ['pending', 'confirmed']);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      return { success: false, error: 'Greška pri otkazivanju rezervacije' };
    }
  }

  // Confirm reservation (convert to order)
  static async confirmReservation(reservationId: number, userId: string): Promise<{ success: boolean; orderId?: number; error?: string }> {
    try {
      // Check if reservation exists and belongs to user
      const { data: reservation } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .single();

      if (!reservation) {
        return { success: false, error: 'Rezervacija nije pronađena ili nije potvrđena' };
      }

      if (reservation.order_id) {
        // Update order status to confirmed
        const { error: orderError } = await supabase
          .from('order')
          .update({ status: 'confirmed' })
          .eq('id', reservation.order_id);

        if (orderError) {
          return { success: false, error: orderError.message };
        }

        return { success: true, orderId: reservation.order_id };
      }

      return { success: false, error: 'Rezervacija nema povezanu porudžbinu' };
    } catch (error) {
      console.error('Error confirming reservation:', error);
      return { success: false, error: 'Greška pri potvrđivanju rezervacije' };
    }
  }

  // Process reservations for a specific date (admin function)
  static async processReservationsForDate(date: string): Promise<{ success: boolean; processed: number; error?: string }> {
    try {
      // This function would need to be implemented properly
      // For now, return a placeholder implementation
      return { success: true, processed: 0 };
    } catch (error) {
      console.error('Error processing reservations:', error);
      return { success: false, error: 'Greška pri obradi rezervacija', processed: 0 };
    }
  }

  // Cancel unconfirmed reservations (admin function)
  static async cancelUnconfirmedReservations(): Promise<{ success: boolean; cancelled: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('cancel_unconfirmed_reservations');

      if (error) {
        return { success: false, error: error.message, cancelled: 0 };
      }

      return { success: true, cancelled: data || 0 };
    } catch (error) {
      console.error('Error cancelling unconfirmed reservations:', error);
      return { success: false, error: 'Greška pri otkazivanju nepotvrđenih rezervacija', cancelled: 0 };
    }
  }
}
