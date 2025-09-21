import { Link, router } from 'expo-router';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { useCartStore } from '../store/cart-store';
import { supabase } from '../lib/supabase';
import { Tables } from '../types/database.types';
import { useAuth } from '../providers/auth-provider';

export const ListHeader = ({
  categories,
}: {
  categories: Tables<'category'>[];
}) => {
  const { getItemCount } = useCartStore();
  const { session } = useAuth();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/auth'); // Redirect to auth page after sign out
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleSignIn = () => {
    router.push('/auth');
  };

  return (
    <View style={[styles.headerContainer]}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://www.vhv.rs/dpng/d/550-5508649_person-image-placeholder-clipart-png-download-no-profile.png' }}
              style={styles.avatarImage}
            />
           
          </View>
        </View>
        <View style={styles.headerRight}>
          <Link style={styles.cartContainer} href='/cart' asChild>
            <Pressable>
              {({ pressed }) => (
                <View>
                  <FontAwesome
                    name='shopping-cart'
                    size={25}
                    color='gray'
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />

                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{getItemCount()}</Text>
                  </View>
                </View>
              )}
            </Pressable>
          </Link>
          {session ? (
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.authButton}
            >
              <Text style={styles.authButtonText}>Odjavite se</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSignIn}
              style={styles.authButton}
            >
              <Text style={styles.authButtonText}>Prijavite se</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.heroContainer}>
        <Image
          source={{
            uri: 'https://laoiuxdnacadkmyqwszt.supabase.co/storage/v1/object/public/app-images//KUPI%20SADA%20(2).png',
          }}
          style={styles.heroImage}
        />
      </View>
      <View style={styles.categoriesContainer}>
        <Text style={styles.sectionTitle}>Kategorije</Text>
        <FlatList
          data={categories}
          renderItem={({ item }) => (
            <Link asChild href={`/categories/${item.slug}`}>
              <Pressable style={styles.category}>
                <Image
                  source={{ uri: item.imageurl || 'https://via.placeholder.com/80x120/cccccc/666666?text=No+Image' }}
                  style={styles.categoryImage}
                />
                <Text style={styles.categoryText}>{item.name || 'Category'}</Text>
              </Pressable>
            </Link>
          )}
          keyExtractor={item => item.name || item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    gap: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    paddingTop:10,
    paddingLeft:5,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
  },
  cartContainer: {
    padding: 10,
  },
  authButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'transparent',
  },
  authButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
  heroContainer: {
    width: '100%',
    height: 200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 20,
  },
  categoriesContainer: {},
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  category: {
    width: 100,
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryImage: {
    width: 80,
    height: 120,
    borderRadius: 30,
    marginBottom: 8,
  },
  categoryText: {},
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: 10,
    backgroundColor: '#fa7d15',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
