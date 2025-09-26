import { router } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Tables } from '../types/database.types';
import { useAuth } from '../providers/auth-provider';
import { useOrderNotifications } from '../hooks/useOrderNotifications';

export const ListHeader = ({
  categories,
}: {
  categories: Tables<'category'>[];
}) => {
  const { session } = useAuth();
  const { unreadCount } = useOrderNotifications();

  return (
    <View style={[styles.headerContainer]}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>

        </View>
        <View style={styles.headerRight}>
          {/* Account button removed */}
        </View>
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
});
