import { Stack } from 'expo-router';
import { useAuth } from '../../providers/auth-provider';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen
        name='index'
        options={{
          title: 'Admin',
          headerStyle: {
            backgroundColor: '#1BC464'
          },
          headerTintColor: '#fff'
        }}
      />
      <Stack.Screen
        name='orders'
        options={{
          title: 'Manage Orders',
          headerStyle: {
            backgroundColor: '#1BC464'
          },
          headerTintColor: '#fff'
        }}
      />
      <Stack.Screen
        name='products'
        options={{
          title: 'Manage Products',
          headerStyle: {
            backgroundColor: '#1BC464'
          }, 
          headerTintColor: '#fff'
        }}
      />
    </Stack>
  );
}
