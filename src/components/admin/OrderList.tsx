import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  LayoutAnimation,
  UIManager,
  Platform,
  FlatList,
  ActivityIndicator, // Za bolji prikaz ucitavanja
  Alert,
} from 'react-native';
import { Toast } from 'react-native-toast-notifications';
import { OrderStatus } from '../../types';

// Omogucavanje LayoutAnimation za Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Definicija teme za lakse odrzavanje boja i stilova
const THEME = {
  colors: {
    primary: '#0A2463',
    secondary: '#3E92CC',
    success: '#7EB77F',
    warning: '#FF9800',
    info: '#02C3BD',
    white: '#FFFFFF',
    lightGray: '#F8F9FA',
    mediumGray: '#DEE2E6',
    darkGray: '#6C757D',
    text: '#212529',
    background: '#FFFFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
  },
  borderRadius: 8,
};

// Mapa statusa i njihovih boja - poboljšane boje
const STATUS_COLORS: Record<string, string> = {
  // Originalni statusi
  'čekanje': '#F39C12',      // Narandžasta - čekanje
  'Completed': '#27AE60',    // Zelena - završeno
  'Shipped': '#3498DB',      // Plava - poslato
  'InTransit': '#9B59B6',    // Ljubičasta - u tranzitu
  'cancelled': '#E74C3C',    // Crvena - otkazano
  // Prevedeni statusi
  'Na čekanju': '#F39C12',   // Narandžasta
  'Završeno': '#27AE60',     // Zelena
  'Poslato': '#3498DB',      // Plava
  'U Tranzitu': '#9B59B6',   // Ljubičasta
  'Otkazano': '#E74C3C',     // Crvena
};

// Mapa statusa i njihovih pozadinskih boja
const STATUS_BG_COLORS: Record<string, string> = {
  // Originalni statusi
  'čekanje': '#FEF9E7',      // Svetlo narandžasta
  'Completed': '#D5F4E6',     // Svetlo zelena
  'Shipped': '#EBF3FD',       // Svetlo plava
  'InTransit': '#F4E6F7',     // Svetlo ljubičasta
  'cancelled': '#FADBD8',     // Svetlo crvena
  // Prevedeni statusi
  'Na čekanju': '#FEF9E7',    // Svetlo narandžasta
  'Završeno': '#D5F4E6',      // Svetlo zelena
  'Poslato': '#EBF3FD',       // Svetlo plava
  'U Tranzitu': '#F4E6F7',    // Svetlo ljubičasta
  'Otkazano': '#FADBD8',      // Svetlo crvena
};

// Mapa statusa i njihovih labela na srpskom
const STATUS_LABELS: Record<OrderStatus, string> = {
  'čekanje': 'Na Čekanju',
  Completed: 'Završeno',
  Shipped: 'Poslato',
  InTransit: 'U Tranzitu',
  cancelled: 'Otkazano',
};

// Modernizovana i sigurnija funkcija za formatiranje datuma
const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return 'Nepoznat datum';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Nevažeći datum';

    // Intl je moderan i standardan nacin za formatiranje
    return new Intl.DateTimeFormat('sr-RS', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(date);
  } catch (error) {
    console.error('Greška pri formatiranju datuma:', error);
    return 'Greška u datumu';
  }
};

// Definisanje tipova
type Order = {
  id: number;
  slug: string;
  created_at: string;
  totalPrice: number;
  status: OrderStatus;
  user_email?: string;
  users: { 
    email: string;
    name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
  } | null;
  items: {
    product: {
      title: string;
      heroImage: string;
    };
    size: string;
    quantity: number;
  }[];
};

type OrderListProps = {
  orders: Order[];
  isLoading: boolean;
  onUpdateStatus: (orderId: number, status: OrderStatus) => void;
};

// Statička lista statusa
const STATUSES: OrderStatus[] = ['čekanje', 'InTransit', 'Shipped', 'Completed', 'cancelled'];

// --- Komponenta za jedan red artikla ---
const OrderProductItem = React.memo(
  ({ item }: { item: Order['items'][0] }) => (
    <View style={styles.productItem}>
      <Image
        source={{ uri: item.product?.heroImage || 'https://via.placeholder.com/60' }}
        style={styles.productImage}
      />
      <View style={styles.productDetails}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.product?.title || 'Naziv proizvoda nije dostupan'}
        </Text>
        <Text style={styles.productInfo}>
          Veličina: {item.size || 'N/A'} • Količina: {item.quantity || 0}
        </Text>
      </View>
    </View>
  )
);

// --- Komponenta za biranje statusa ---
const StatusSelector = React.memo(({
    currentStatus,
    onSelect,
}: {
    currentStatus: OrderStatus;
    onSelect: (status: OrderStatus) => void;
}) => (
    <View>
        <Text style={styles.changeStatusTitle}>Promeni status:</Text>
        <View style={styles.statusSelectorContainer}>
            {STATUSES.map((status) => {
                const isSelected = status === currentStatus;
                return (
                    <Pressable
                        key={status}
                        onPress={() => onSelect(status)}
                        style={[
                            styles.statusChip,
                            { 
                              backgroundColor: STATUS_BG_COLORS[status] || '#E8F4FD',
                              borderColor: STATUS_COLORS[status] || '#3498DB'
                            },
                            !isSelected && styles.statusChipInactive,
                        ]}
                    >
                        <Text style={[
                          styles.statusChipText,
                          { color: STATUS_COLORS[status] || '#3498DB' }
                        ]}>
                          {STATUS_LABELS[status] || status}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    </View>
));


// --- Glavna komponenta za prikaz jedne porudzbine ---
const OrderItem = React.memo(
  ({ order, onUpdateStatus }: { order: Order; onUpdateStatus: OrderListProps['onUpdateStatus'] }) => {
    // Lokalno stanje za pracenje da li je kartica otvorena
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpansion = useCallback(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded((prev) => !prev);
    }, []);

    const handleStatusChange = useCallback(
      (status: OrderStatus) => {
        if (status !== order.status) {
          // Show confirmation dialog for cancellation
          if (status === 'cancelled') {
            Alert.alert(
              'Potvrda otkazivanja',
              'Da li ste sigurni da želite da otkažete porudžbinu? Ovo će vratiti sve proizvode na stanje.',
              [
                {
                  text: 'Odustani',
                  style: 'cancel',
                },
                {
                  text: 'Otkaži porudžbinu',
                  style: 'destructive',
                  onPress: () => {
                    onUpdateStatus(order.id, status);
                  },
                },
              ]
            );
          } else {
            onUpdateStatus(order.id, status);
            Toast.show('Status uspešno promenjen!', { type: 'success', duration: 2500 });
          }
        }
      },
      [order.id, order.status, onUpdateStatus]
    );


    // Ekstraktovanje podataka o korisniku
    const userData = order.users;
    
    const customerName = userData?.name && userData?.last_name 
      ? `${userData.name} ${userData.last_name}` 
      : userData?.name || 'Nepoznato ime';
    
    const customerEmail = userData?.email || order.user_email || 'N/A';
    const customerPhone = userData?.phone || 'N/A';
    const customerLocation = userData?.city ? `${userData.city}${userData?.address ? `, ${userData.address}` : ''}` : 'N/A';

    return (
      <Pressable onPress={toggleExpansion} style={styles.card}>
        {/* === Zaglavlje kartice (uvek vidljivo) === */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.orderId}>Porudžbina #{order.id}</Text>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.orderEmail}>{customerEmail}</Text>
            <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
          </View>
          <View style={styles.cardHeaderSide}>
            <Text style={styles.totalPrice}>${order.totalPrice.toFixed(2)}</Text>
            <View style={[
                styles.statusBadge, 
                { 
                  backgroundColor: STATUS_BG_COLORS[order.status] || '#E8F4FD',
                  borderColor: STATUS_COLORS[order.status] || '#3498DB'
                }
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: STATUS_COLORS[order.status] || '#3498DB' }
              ]}>
                {STATUS_LABELS[order.status] || order.status}
              </Text>
            </View>
          </View>
        </View>

        {/* === Telo kartice (vidljivo samo kad je otvoreno) === */}
        {isExpanded && (
          <View style={styles.cardBody}>
            <View style={styles.divider} />
            
            {/* Informacije o kupcu */}
            <View style={styles.customerInfoSection}>
              <Text style={styles.sectionTitle}>Informacije o kupcu</Text>
              <View style={styles.customerDetails}>
                <Text style={styles.customerDetailItem}>
                  <Text style={styles.customerDetailLabel}>Ime: </Text>
                  {customerName}
                </Text>
                <Text style={styles.customerDetailItem}>
                  <Text style={styles.customerDetailLabel}>Email: </Text>
                  {customerEmail}
                </Text>
                <Text style={styles.customerDetailItem}>
                  <Text style={styles.customerDetailLabel}>Telefon: </Text>
                  {customerPhone}
                </Text>
                <Text style={styles.customerDetailItem}>
                  <Text style={styles.customerDetailLabel}>Lokacija: </Text>
                  {customerLocation}
                </Text>
              </View>
            </View>
            
            <Text style={styles.itemsTitle}>Artikli ({order.items?.length || 0}):</Text>
            {order.items?.map((item, index) => (
              <OrderProductItem key={`${item.product.title}-${index}`} item={item} />
            ))}

            <View style={styles.divider} />

            <StatusSelector 
              currentStatus={order.status}
              onSelect={handleStatusChange}
            />
          </View>
        )}
      </Pressable>
    );
  }
);

// --- Komponenta liste porudzbina ---
export function OrderList({ orders, isLoading, onUpdateStatus }: OrderListProps) {
  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.messageText}>Učitavanje porudžbina...</Text>
      </View>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.messageText}>Nema pronađenih porudžbina.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(order) => order.id.toString()}
      contentContainerStyle={styles.listContainer}
      renderItem={({ item }) => <OrderItem order={item} onUpdateStatus={onUpdateStatus} />}
      ItemSeparatorComponent={() => <View style={{ height: THEME.spacing.sm }} />}
    />
  );
}

// --- Stilovi ---
const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
  listContainer: {
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
  },
  messageText: {
    fontSize: 16,
    color: THEME.colors.darkGray,
    marginTop: THEME.spacing.md,
  },
  // Card stilovi
  card: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.mediumGray,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    marginVertical: THEME.spacing.xs,
  },
  orderEmail: {
    fontSize: 14,
    color: THEME.colors.darkGray,
    marginVertical: THEME.spacing.xs,
  },
  orderDate: {
    fontSize: 12,
    color: THEME.colors.darkGray,
  },
  cardHeaderSide: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.sm,
  },
  statusBadge: {
    paddingVertical: THEME.spacing.xs,
    paddingHorizontal: THEME.spacing.sm,
    borderRadius: THEME.borderRadius,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginTop: THEME.spacing.md,
  },
  customerInfoSection: {
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  customerDetails: {
    backgroundColor: THEME.colors.lightGray,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius,
  },
  customerDetailItem: {
    fontSize: 14,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  customerDetailLabel: {
    fontWeight: '600',
    color: THEME.colors.darkGray,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.mediumGray,
    marginVertical: THEME.spacing.md,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  // Stilovi za artikal
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: THEME.borderRadius,
    marginRight: THEME.spacing.md,
    backgroundColor: THEME.colors.lightGray,
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: THEME.colors.text,
  },
  productInfo: {
    fontSize: 14,
    color: THEME.colors.darkGray,
    marginTop: THEME.spacing.xs,
  },
  // Stilovi za biranje statusa
  changeStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  statusSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },
  statusChip: {
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusChipInactive: {
    opacity: 0.6,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});