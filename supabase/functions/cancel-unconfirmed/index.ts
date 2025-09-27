import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting cancellation of unconfirmed reservations...')

    // Cancel reservations that are confirmed but order not confirmed within 24h
    const { data: cancelledReservations, error: reservationsError } = await supabaseClient
      .from('reservations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'confirmed')
      .lt('confirmed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not('order_id', 'is', null)
      .select('id, order_id')

    if (reservationsError) {
      console.error('Error cancelling reservations:', reservationsError)
    } else {
      console.log(`Cancelled ${cancelledReservations?.length || 0} reservations`)
    }

    // Also cancel orders that are pending_confirmation for more than 24h
    const { data: cancelledOrders, error: ordersError } = await supabaseClient
      .from('order')
      .update({
        status: 'cancelled'
      })
      .eq('status', 'pending_confirmation')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .select('id')

    if (ordersError) {
      console.error('Error cancelling orders:', ordersError)
    } else {
      console.log(`Cancelled ${cancelledOrders?.length || 0} orders`)
    }

    const totalCancelled = (cancelledReservations?.length || 0) + (cancelledOrders?.length || 0)

    console.log(`Cancellation complete. Total cancelled: ${totalCancelled}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cancellation of unconfirmed reservations completed',
        cancelled_reservations: cancelledReservations?.length || 0,
        cancelled_orders: cancelledOrders?.length || 0,
        total_cancelled: totalCancelled
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in cancel-unconfirmed function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
