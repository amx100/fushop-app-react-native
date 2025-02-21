import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

export async function registerForPushNotificationsAsync() {
  try {
    // Provera dozvola
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Zatražite dozvolu ako nije odobrena
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Prekinite ako nema dozvole
    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return;
    }

    // Dobijanje push tokena
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId
    });

    // Dobijanje trenutnog korisnika
    const { data: { user } } = await supabase.auth.getUser();

    // Čuvanje tokena u Supabase
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert({ 
        token: token.data, 
        user_id: user?.id 
      });

    if (error) console.error('Error saving push token', error);

  } catch (error) {
    console.error('Push token registration error:', error);
  }
} 