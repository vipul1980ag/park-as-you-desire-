import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getParkingById, fetchOSMRoute, formatRate } from '../services/api';
import LeafletMapView from '../components/LeafletMapView';

const COLORS = {
  primary: '#1a3c5e',
  accent: '#f0a500',
  background: '#f5f5f5',
  white: '#ffffff',
  textDark: '#333333',
  textSecondary: '#666666',
  border: '#d0d8e0',
  privateBadge: '#1a3c5e',
  publicBadge: '#2e7d32',
  success: '#2e7d32',
  warning: '#e65100',
  error: '#c62828',
};

function SpotBadge({ availableSpots, totalSpots }) {
  const ratio = totalSpots > 0 ? availableSpots / totalSpots : 1;
  const color =
    availableSpots === 0 ? COLORS.error : ratio < 0.2 ? COLORS.warning : COLORS.success;
  const label =
    availableSpots === 0 ? 'Full' : availableSpots <= 3 ? 'Almost Full' : 'Available';
  return (
    <View style={[styles.spotBadge, { borderColor: color }]}>
      <View style={[styles.spotDot, { backgroundColor: color }]} />
      <Text style={[styles.spotBadgeText, { color }]}>
        {availableSpots}/{totalSpots} {label}
      </Text>
    </View>
  );
}

export default function ParkingDetailScreen({ navigation, route }) {
  const { parkingId, parking: passedParking, lat, lng } = route.params || {};
  const [parking, setParking] = useState(passedParking || null);
  const [loading, setLoading] = useState(!passedParking);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!passedParking) loadParking();
  }, [parkingId]);

  useEffect(() => {
    if (parking && lat && lng) loadRoute();
  }, [parking]);

  const loadParking = async () => {
    setLoading(true);
    try {
      const data = await getParkingById(parkingId, { lat, lng });
      setParking(data);
    } catch {
      Alert.alert('Error', 'Failed to load parking details.');
    } finally {
      setLoading(false);
    }
  };

  const loadRoute = async () => {
    if (!parking || !lat || !lng) return;
    setLoadingRoute(true);
    try {
      const r = await fetchOSMRoute(lat, lng, parking.lat, parking.lng);
      setRouteInfo(r);
    } catch (_) {} finally {
      setLoadingRoute(false);
    }
  };

  const handleBook = () => {
    if (!parking) return;
    Alert.alert(
      'Book This Spot',
      `Confirm booking at "${parking.name}"?\n\n${formatRate(parking)} (${parking.costPerHour > 0 ? `£${parking.costPerDay?.toFixed(2)}/day` : 'Free'})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Booking',
          onPress: () =>
            Alert.alert('Booking Confirmed!', `Your spot at ${parking.name} has been reserved.`, [
              { text: 'Great!', onPress: () => navigation.goBack() },
            ]),
        },
      ]
    );
  };

  const handleNavigate = () => {
    if (!parking) return;
    const url =
      Platform.OS === 'ios'
        ? `maps://app?daddr=${parking.lat},${parking.lng}`
        : `google.navigation:q=${parking.lat},${parking.lng}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/?daddr=${parking.lat},${parking.lng}`)
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Parking Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!parking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Parking Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="car-outline" size={60} color={COLORS.border} />
          <Text style={styles.loadingText}>Parking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const distanceText =
    parking.distance != null ? `${parking.distance} km from destination` : null;
  const rateLabel = formatRate(parking);
  const isPrivate = parking.isPrivate;

  // Map markers: just the parking spot
  const mapMarkers = [{
    id: parking.id, lat: parking.lat, lng: parking.lng,
    type: parking.type, name: parking.name, address: parking.address,
    rate: rateLabel,
  }];

  // Route coordinates for the map
  const routeCoords = routeInfo?.coords || null;
  const etaText = routeInfo
    ? routeInfo.duration < 60
      ? `< 1 min`
      : `${Math.round(routeInfo.duration / 60)} min`
    : null;
  const routeDistText = routeInfo
    ? routeInfo.distance < 1000
      ? `${Math.round(routeInfo.distance)} m`
      : `${(routeInfo.distance / 1000).toFixed(1)} km`
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{parking.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroTitleBlock}>
              <Text style={styles.heroName}>{parking.name}</Text>
              <View style={styles.heroBadgeRow}>
                <View style={[styles.accessBadge, { backgroundColor: isPrivate ? '#e3f2fd' : '#e8f5e9' }]}>
                  <Ionicons
                    name={isPrivate ? 'lock-closed' : 'earth'}
                    size={11}
                    color={isPrivate ? COLORS.privateBadge : COLORS.publicBadge}
                  />
                  <Text style={[styles.accessBadgeText, { color: isPrivate ? COLORS.privateBadge : COLORS.publicBadge }]}>
                    {isPrivate ? 'Private' : 'Public'}
                  </Text>
                </View>
              </View>
            </View>
            <SpotBadge availableSpots={parking.availableSpots || 0} totalSpots={parking.totalSpots || 1} />
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>{parking.address}</Text>
          </View>
          {distanceText && (
            <View style={styles.infoRow}>
              <Ionicons name="navigate" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>{distanceText}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="time" size={16} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Open: {parking.availableFrom || '00:00'} – {parking.availableTo || '23:59'}
            </Text>
          </View>
        </View>

        {/* Pricing Card */}
        <View style={styles.pricingCard}>
          <Text style={styles.cardSectionTitle}>Pricing</Text>
          <View style={styles.pricingRow}>
            <View style={styles.priceItem}>
              <Ionicons name="time-outline" size={22} color={COLORS.accent} />
              <Text style={styles.priceAmount}>{rateLabel}</Text>
              <Text style={styles.priceLabel}>best rate</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceItem}>
              <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
              <Text style={styles.priceAmount}>
                {parking.costPerDay > 0 ? `£${parking.costPerDay.toFixed(2)}` : 'Free'}
              </Text>
              <Text style={styles.priceLabel}>per day</Text>
            </View>
            {parking.costPerHour > 0 && (
              <>
                <View style={styles.priceDivider} />
                <View style={styles.priceItem}>
                  <Ionicons name="cash-outline" size={22} color={COLORS.success} />
                  <Text style={styles.priceAmount}>£{parking.costPerHour.toFixed(2)}</Text>
                  <Text style={styles.priceLabel}>per hour</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Route info (if available) */}
        {(etaText || loadingRoute) && (
          <View style={styles.routeCard}>
            <Text style={styles.cardSectionTitle}>Route from Your Location</Text>
            {loadingRoute ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <View style={styles.routeGrid}>
                <View style={styles.routeCell}>
                  <Ionicons name="navigate-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.routeCellValue}>{routeDistText}</Text>
                  <Text style={styles.routeCellLabel}>Distance</Text>
                </View>
                <View style={styles.routeCell}>
                  <Ionicons name="time-outline" size={20} color={COLORS.accent} />
                  <Text style={styles.routeCellValue}>{etaText}</Text>
                  <Text style={styles.routeCellLabel}>Drive time</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Map with route */}
        <View style={styles.mapCard}>
          <Text style={styles.cardSectionTitle}>Location {loadingRoute ? '(loading route…)' : routeInfo ? '+ Route' : ''}</Text>
          <View style={styles.mapContainer}>
            <LeafletMapView
              ref={mapRef}
              centerLat={parking.lat}
              centerLng={parking.lng}
              zoom={15}
              markers={mapMarkers}
              route={routeCoords}
              userLat={lat}
              userLng={lng}
            />
          </View>
          <TouchableOpacity style={styles.openMapBtn} onPress={handleNavigate}>
            <Ionicons name="navigate" size={14} color={COLORS.white} />
            <Text style={styles.openMapBtnText}>Open Navigation</Text>
          </TouchableOpacity>
        </View>

        {/* Availability */}
        {parking.availableDays && parking.availableDays.length > 0 && (
          <View style={styles.availCard}>
            <Text style={styles.cardSectionTitle}>Availability</Text>
            <View style={styles.daysRow}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const isAvail = parking.availableDays.includes(day);
                return (
                  <View key={day} style={[styles.dayChip, isAvail ? styles.dayChipActive : styles.dayChipInactive]}>
                    <Text style={[styles.dayChipText, isAvail ? styles.dayChipTextActive : styles.dayChipTextInactive]}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {parking.description ? (
          <View style={styles.descCard}>
            <Text style={styles.cardSectionTitle}>About This Parking</Text>
            <Text style={styles.descText}>{parking.description}</Text>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.navBtn} onPress={handleNavigate} activeOpacity={0.85}>
          <Ionicons name="navigate" size={18} color={COLORS.primary} />
          <Text style={styles.navBtnText}>Navigate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
          <Text style={styles.bookBtnText}>Book This Spot</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.white, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  scroll: { flex: 1 },

  heroCard: {
    backgroundColor: COLORS.white, margin: 16, borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  heroTitleBlock: { flex: 1, marginRight: 10 },
  heroName: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginBottom: 8, lineHeight: 26 },
  heroBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  accessBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  accessBadgeText: { fontSize: 11, fontWeight: '700' },
  spotBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
  spotDot: { width: 8, height: 8, borderRadius: 4 },
  spotBadgeText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  pricingCard: {
    backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },
  pricingRow: { flexDirection: 'row', alignItems: 'center' },
  priceItem: { flex: 1, alignItems: 'center', gap: 4 },
  priceAmount: { fontSize: 22, fontWeight: '900', color: COLORS.textDark },
  priceLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceDivider: { width: 1, height: 50, backgroundColor: COLORS.border },

  routeCard: {
    backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  routeGrid: { flexDirection: 'row', gap: 12 },
  routeCell: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: COLORS.background, borderRadius: 10, padding: 12 },
  routeCellValue: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  routeCellLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase' },

  mapCard: {
    backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  mapContainer: { height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  openMapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 10,
  },
  openMapBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  availCard: {
    backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: { width: 40, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dayChipActive: { backgroundColor: COLORS.primary },
  dayChipInactive: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  dayChipText: { fontSize: 11, fontWeight: '700' },
  dayChipTextActive: { color: COLORS.white },
  dayChipTextInactive: { color: COLORS.border },

  descCard: {
    backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  descText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 16, gap: 12,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#e8edf2',
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 2, borderColor: COLORS.primary, gap: 8,
  },
  navBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.accent, gap: 8,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  bookBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
});
