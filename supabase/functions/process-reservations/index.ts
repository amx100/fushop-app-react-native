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

    console.log('Starting reservation processing...')

    // Get today's date
    const today = new Date().toISOString().split('T')[0]
    console.log(`Processing reservations for date: ${today}`)

    // Get all pending reservations for today
    const { data: reservations, error: fetchError } = await supabaseClient
      .from('reservations')
      .select(`
        id,
        user_id,
        reservation_date,
        status,
        reservation_items (
          id,
          product_id,
          size_id,
          quantity,
          product:product_id (
            id,
            title,
            price
          ),
          sizes:size_id (
            id,
            value
          )
        )
      `)
      .eq('reservation_date', today)
      .eq('status', 'pending')

    if (fetchError) {
      console.error('Error fetching reservations:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reservations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${reservations?.length || 0} reservations to process`)

    if (!reservations || reservations.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No reservations to process',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processedCount = 0
    let errorCount = 0

    // Process each reservation
    for (const reservation of reservations) {
      try {
        console.log(`Processing reservation ${reservation.id} for user ${reservation.user_id}`)

        // Calculate total price
        const totalPrice = reservation.reservation_items.reduce((total, item) => {
          return total + (item.product.price * item.quantity)
        }, 0)

        // Create order
        const { data: order, error: orderError } = await supabaseClient
          .from('order')
          .insert({
            user_id: reservation.user_id,
            totalprice: totalPrice,
            status: 'pending_confirmation',
            slug: `reservation-${reservation.id}`,
            description: `Automatska porudžbina iz rezervacije #${reservation.id}`,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (orderError) {
          console.error(`Error creating order for reservation ${reservation.id}:`, orderError)
          errorCount++
          continue
        }

        console.log(`Created order ${order.id} for reservation ${reservation.id}`)

        // Create order items
        const orderItems = reservation.reservation_items.map(item => ({
          order_id: order.id,
          product: item.product_id,
          product_id: item.product_id,
          quantity: item.quantity,
          size_id: item.size_id,
          size: item.sizes.value,
          created_at: new Date().toISOString()
        }))

        const { error: itemsError } = await supabaseClient
          .from('order_item')
          .insert(orderItems)

        if (itemsError) {
          console.error(`Error creating order items for reservation ${reservation.id}:`, itemsError)
          // Clean up the order
          await supabaseClient.from('order').delete().eq('id', order.id)
          errorCount++
          continue
        }

        // Update reservation status
        const { error: updateError } = await supabaseClient
          .from('reservations')
          .update({
            status: 'confirmed',
            order_id: order.id,
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', reservation.id)

        if (updateError) {
          console.error(`Error updating reservation ${reservation.id}:`, updateError)
          errorCount++
          continue
        }

        console.log(`Successfully processed reservation ${reservation.id}`)
        processedCount++

      } catch (error) {
        console.error(`Unexpected error processing reservation ${reservation.id}:`, error)
        errorCount++
      }
    }

    // Also cancel unconfirmed reservations that are older than 24 hours
    const { data: cancelledCount } = await supabaseClient.rpc('cancel_unconfirmed_reservations')

    console.log(`Processing complete. Processed: ${processedCount}, Errors: ${errorCount}, Cancelled: ${cancelledCount || 0}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reservation processing completed',
        processed: processedCount,
        errors: errorCount,
        cancelled: cancelledCount || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in process-reservations function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
