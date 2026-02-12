import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Animated, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import IIcon from 'react-native-vector-icons/Ionicons';
import { _http_request, hostServer, llStorage } from '../funcs/functions';
import { Loaderx, bottomsheet_renderBackdrop } from '../funcs/functions_stateful';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';

// Colors for tiers - will use dynamically based on tier count
const TIER_COLORS = ['#F25F7F', '#D4AF37', '#5B8DEF', '#34C759'];


export const Screen_Subscribe = ({ route, navigation }: { route: any; navigation: any }) => {
  const __product_MAPPER_mainsub = llStorage.purchasing_product?.get()?.mainsub;

  // Get all tier keys from the mapper
  const tierKeys = Object.keys(__product_MAPPER_mainsub || {});

  // Get profile data
  const getProfile = llStorage.currentProfile.get()?.currentUser;
  const activeSubscription = getProfile?.user_effect?.has_active_subscription ?? false;
  const userCurrentTier = getProfile?.user_effect?.subscription_plan;

  const getTierKeyByName = (planName?: string) => {
    if (!planName) return '';
    const normalized = String(planName).toLowerCase();
    return (
      tierKeys.find((key) => {
        const tierItems = __product_MAPPER_mainsub?.[key] || [];
        const name = tierItems[0]?.name;
        return String(name).toLowerCase() === normalized;
      }) || ''
    );
  };

  // Initialize selected tier based on user's current subscription
  const [selectedTier, setSelectedTier] = useState<string>(() => {
    if (activeSubscription && userCurrentTier) {
      const mapped = getTierKeyByName(userCurrentTier);
      if (mapped) return mapped;
    }
    return route?.params?.tab || (tierKeys[0] || '');
  });

  // Initialize selected billing cycle based on available options
  const [selectedDuration, setSelectedDuration] = useState<string>(() => {
    const tierItems = __product_MAPPER_mainsub?.[selectedTier] || [];
    return tierItems[0]?.interval_days ? String(tierItems[0].interval_days) : '';
  });

  const paymentSheetRef = useRef<BottomSheet>(null);
  const paymentSheetSnap = useMemo(() => ['40%'], []);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get('window');
  const cycleItemWidth = Math.min(180, Math.max(140, Math.round(screenWidth * 0.45)));
  const cycleSidePadding = Math.max(16, Math.round((screenWidth - cycleItemWidth) / 2));

  // Build tier data dynamically
  const tiers = useMemo(() => {
    const tierData: Record<string, any> = {};

    tierKeys.forEach((tierKey, index) => {
      const tierItems = __product_MAPPER_mainsub?.[tierKey] || [];
      const tierMeta = tierItems[0] || {};

      // Group prices by interval_days
      const prices: Record<string, string> = {};
      tierItems.forEach((item: any) => {
        if (item?.interval_days) {
          prices[String(item.interval_days)] = String(item.price);
        }
      });

      // Generate features based on tier
      const features = generateFeatures(String(tierMeta?.name ?? tierKey));

      tierData[tierKey] = {
        name: (tierMeta?.name ?? tierKey).toUpperCase(),
        color: TIER_COLORS[index] || '#F25F7F',
        features,
        prices,
        id: tierKey
      };
    });

    return tierData;
  }, [__product_MAPPER_mainsub]);

  // Update selected duration when tier changes
  useEffect(() => {
    const tierItems = __product_MAPPER_mainsub?.[selectedTier] || [];
    if (tierItems.length > 0) {
      setSelectedDuration(tierItems[0]?.interval_days ? String(tierItems[0].interval_days) : '');
    }
  }, [selectedTier]);

  const handleSubscribe = (paymentMethod: 'iap' | 'card') => {
    const actionName = (globalThis as any)?.http_namer?.pushSubscribe ?? 'pushSubscribe';
    Loaderx.show();

    // Find the selected product item
    const tierItems = __product_MAPPER_mainsub?.[selectedTier] || [];
    const selectedItem = tierItems.find(
      (item: any) => String(item.interval_days) === selectedDuration
    );

    if (!selectedItem) {
      Loaderx.hide();
      Alert.alert('Error', 'Selected plan not available');
      return;
    }

    _http_request({
      customApiUrl: hostServer() + "/api/core/v1/pushSubscribe",
      reqType: 'POST',
      bodyArray: {
        action: actionName,
        tier: selectedTier,
        whentype: selectedDuration,
        product_id: selectedItem.sku,
        payment_method: paymentMethod
      }
    }).then((fg: any) => {
      if (fg?.code === 200) {
        llStorage.currentProfile.load().then(() => {
          setTimeout(() => {
            Loaderx.hide();
            navigation.goBack();
          }, 800);
        });
      } else {
        Loaderx.hide();
        Alert.alert(fg?.message ?? 'There has been an error.');
      }
    });
  };

  const openPaymentSheet = () => {
    if (!selectedDuration) return;
    paymentSheetRef.current?.snapToIndex(0);
  };

  // Get available billing cycles for selected tier
  const getAvailableCycles = () => {
    const tierItems = __product_MAPPER_mainsub?.[selectedTier] || [];
    return tierItems.map((item: any) => String(item.interval_days));
  };

  const selectedPrice = tiers[selectedTier]?.prices?.[selectedDuration] || '';
  const selectedTierName = tiers[selectedTier]?.name || '';

  return (
    <LinearGradient colors={['#0f0b14', '#171126', '#0f111a']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        <View style={styles.tierRow}>
          {tierKeys.map((tierKey) => {
            const tier = tiers[tierKey];
            const isSelected = selectedTier === tierKey;
            const isLocked = activeSubscription && userCurrentTier === tierKey;
            const isActive = activeSubscription && userCurrentTier === tierKey;

            return (
              <TouchableOpacity
                key={tierKey}
                activeOpacity={0.9}
                disabled={isLocked}
                onPress={() => setSelectedTier(tierKey)}
                style={[
                  styles.tierCard,
                  { borderColor: tier.color },
                  isSelected && { backgroundColor: 'rgba(255,255,255,0.05)', shadowColor: tier.color },
                  isLocked && styles.tierCardDisabled,
                ]}
              >
                <View style={styles.tierHeader}>
                  <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
                  {isActive && (
                    <View style={[styles.badge, { backgroundColor: tier.color }]}>
                      <Text style={styles.badgeText}>Active</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.tierId}>{tierKey}</Text>
                <Text style={styles.tierPrice}>
                  {tier.prices[getAvailableCycles()[0]] || ''}
                </Text>
                <View style={styles.tierFooter}>
                  <IIcon name="sparkles-outline" size={16} color={tier.color} />
                  <Text style={styles.tierFooterText}>Priority matching</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What's included</Text>
          <Text style={styles.sectionHint}>Tailored to {tiers[selectedTier]?.name}</Text>
        </View>

        <View style={styles.benefitList}>
          {tiers[selectedTier]?.features.length === 0 ? (
            <Text style={styles.emptyBenefit}>Benefits coming soon.</Text>
          ) : (
            tiers[selectedTier]?.features.map((benefit: string, index: number) => (
              <View key={index} style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: tiers[selectedTier].color }]}>
                  <IIcon name="checkmark" size={12} color="#0f0b14" />
                </View>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Billing cadence</Text>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.cycleRow, { paddingHorizontal: cycleSidePadding }]}
          snapToInterval={cycleItemWidth + 12}
          decelerationRate="fast"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {getAvailableCycles().map((cycle: string, index: number) => {
            const isSelected = selectedDuration === cycle;
            const inputRange = [
              (index - 1) * (cycleItemWidth + 12),
              index * (cycleItemWidth + 12),
              (index + 1) * (cycleItemWidth + 12),
            ];
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.92, 1.06, 0.92],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.7, 1, 0.7],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View key={cycle} style={{ transform: [{ scale }], opacity }}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedDuration(cycle);
                    openPaymentSheet();
                  }}
                  style={[
                    styles.cyclePill,
                    { width: cycleItemWidth, marginRight: 12 },
                    isSelected && { backgroundColor: tiers[selectedTier].color, borderColor: tiers[selectedTier].color },
                  ]}
                >
                  <Text style={[styles.cycleText, isSelected && styles.cycleTextSelected]}>
                    {cycle} days
                  </Text>
                  <Text style={[styles.cyclePrice, isSelected && styles.cycleTextSelected]}>
                    {tiers[selectedTier]?.prices[cycle] || ''}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.ScrollView>


        <Text style={styles.disclaimer}>
          Payments are charged to your account. Auto-renews unless canceled 24 hours before renewal.
        </Text>
      </ScrollView>

      <BottomSheet
        ref={paymentSheetRef}
        index={-1}
        snapPoints={paymentSheetSnap}
        backdropComponent={bottomsheet_renderBackdrop}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.sheetContainer}>
          <SafeAreaView edges={['bottom']}>
            <Text style={styles.sheetTitle}>Choose payment method</Text>
            <Text style={styles.sheetSubtitle}>
              {selectedTierName} • {selectedDuration} days • {selectedPrice}
            </Text>

            <View style={styles.sheetDetails}>
              <View style={styles.sheetRow}>
                <Text style={styles.sheetLabel}>Plan</Text>
                <Text style={styles.sheetValue}>{selectedTierName}</Text>
              </View>
              <View style={styles.sheetRow}>
                <Text style={styles.sheetLabel}>Billing cadence</Text>
                <Text style={styles.sheetValue}>{selectedDuration} days</Text>
              </View>
              <View style={styles.sheetRow}>
                <Text style={styles.sheetLabel}>Price</Text>
                <Text style={styles.sheetValue}>{selectedPrice || '—'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.sheetButton, styles.sheetButtonPrimary]}
              onPress={() => handleSubscribe('iap')}
            >
              <Text style={styles.sheetButtonTextPrimary}>Pay with in-app purchase</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetButton, styles.sheetButtonSecondary]}
              onPress={() => handleSubscribe('card')}
            >
              <Text style={styles.sheetButtonTextSecondary}>Pay with credit card</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCancel} onPress={() => paymentSheetRef.current?.close()}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </BottomSheetView>
      </BottomSheet>
    </LinearGradient>
  );
};

// Helper function to generate features based on tier
const generateFeatures = (tierKey: string): string[] => {
  const features: Record<string, string[]> = {
    plus: [
      'Priority in matchmaking',
      '2 super likes per day',
      'See who liked you',
      'Unlimited matches',
      'Profile boost once a weekly'
    ],
    vip: [
      'All Plus features',
      'Unlimited super likes',
      'Travel mode',
      'Priority customer support'
    ]
  };

  // Default features for unknown tiers
  return features[tierKey] || [
    'Priority matching',
    'Enhanced visibility',
    'Exclusive features'
  ];
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  tierRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  tierCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  tierCardDisabled: { opacity: 0.45 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierName: { fontSize: 16, fontWeight: '700' },
  tierId: { color: '#9ca3af', marginTop: 4, fontSize: 13 },
  tierPrice: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 10 },
  tierFooter: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tierFooterText: { color: '#cbd5e1', fontSize: 13 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  badgeText: { color: '#0f0b14', fontWeight: '700', fontSize: 11 },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  sectionHint: { color: '#9ca3af', fontSize: 13 },
  benefitList: { borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, marginBottom: 20 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  benefitIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  benefitText: { color: '#e5e7eb', fontSize: 15, flex: 1 },
  emptyBenefit: { color: '#9ca3af', fontSize: 14 },
  cycleRow: { flexDirection: 'row', marginBottom: 24 },
  cyclePill: {
    flexBasis: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f3040',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  cycleText: { color: '#e5e7eb', fontWeight: '700' },
  cycleTextSelected: { color: '#0f0b14' },
  cyclePrice: { color: '#cbd5e1', marginTop: 4, fontSize: 13 },
  ctaButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  ctaText: { color: '#0f0b14', fontSize: 17, fontWeight: '800' },
  ctaSubtext: { color: '#0f0b14', fontSize: 13, marginTop: 4 },
  disclaimer: { color: '#9ca3af', fontSize: 12, lineHeight: 16, textAlign: 'center' },

  sheetContainer: { padding: 20 },
  sheetTitle: { color: '#111827', fontSize: 18, fontWeight: '700' },
  sheetSubtitle: { color: '#6b7280', fontSize: 13, marginTop: 6, marginBottom: 12 },
  sheetDetails: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sheetLabel: { color: '#6b7280', fontSize: 12 },
  sheetValue: { color: '#111827', fontSize: 13, fontWeight: '700' },
  sheetButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetButtonPrimary: { backgroundColor: '#111827' },
  sheetButtonSecondary: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  sheetButtonTextPrimary: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  sheetButtonTextSecondary: { color: '#111827', fontSize: 15, fontWeight: '700' },
  sheetCancel: { alignItems: 'center', marginTop: 6 },
  sheetCancelText: { color: '#6b7280', fontSize: 14 },
});
