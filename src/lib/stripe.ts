// 1 setup payment sheet
// 2 Open stripe checkout form

import {
  initPaymentSheet,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';
import { supabase } from './supabase';
import { CollectionMode } from '@stripe/stripe-react-native/lib/typescript/src/types/PaymentSheet';

const fetchStripekeys = async (totalAmount: number) => {
  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: {
      totalAmount,
    },
  });

  if (error) throw new Error(error.message);

  return data;
};

export const setupStripePaymentSheet = async (totalAmount: number) => {
  try {
    // Fetch paymentIntent and publishable key from server
    const { paymentIntent, publicKey, ephemeralKey, customer } =
      await fetchStripekeys(totalAmount);

    if (!paymentIntent || !publicKey) {
      throw new Error('Failed to fetch Stripe keys');
    }

    await initPaymentSheet({
      merchantDisplayName: 'Fashion_united_100',
      paymentIntentClientSecret: paymentIntent,
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      billingDetailsCollectionConfiguration: {
        name: 'always' as CollectionMode,
        phone: 'always' as CollectionMode,
      },
    });
  } catch (error) {
    console.error('Stripe setup error:', error);
    throw new Error('Failed to setup payment: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

export const openStripeCheckout = async () => {
  const { error } = await presentPaymentSheet();

  if (error) {
    // Handle specific error types
    if (error.code === 'NetworkError' || error.message.includes('network')) {
      throw new Error('Network greška. Molimo pokušajte ponovo.');
    }
    if (error.code === 'Canceled') {
      throw new Error('Plaćanje je otkazano.');
    }
    throw new Error(error.message);
  }

  return true;
};
