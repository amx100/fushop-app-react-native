import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../providers/auth-provider';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Verify admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('type')
        .eq('id', user?.id)
        .single();

      if (error || data?.type !== 'ADMIN') {
        router.replace('/');
      }
    };

    checkAdminAccess();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>Welcome, {user?.email}</Text>

      {/* Add your admin features here */}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 