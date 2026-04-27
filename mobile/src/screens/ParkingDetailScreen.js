// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

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

const T = {
  bg: '#0d1b2a',
  surface: '#142033',
  surface2: '#1c2e44',
  border: '#243350',
  gold: '#f0a500',
  goldLight: 'rgba(240,165,0,0.15)',
  goldBorder: 'rgba(240,165,0,0.35)',
  teal: '#0ab5a0',
  tealLight: 'rgba(10,181,160,0.13)',
  purple: '#a78bfa',
  text: '#e2eaf4',
  textMuted: '#6e92b5',
  white: '#ffffff',
  error: '#ff6b6b',
  warning: '#f59e0b',
  success: '#0ab5a0',
};

function SpotBadge({ availableSpots, totalSpots }) {
  const ratio = totalSpots > 0 ? availableSpots / totalSpots : 1;
  const color = availableSpots === 0 ? T.error : ratio < 0.2 ? T.warning : T.success;
  const label = availableSpots === 0 ? 'Full' : availableSpots <= 3 ? 'Almost Full' : 'Available';
  return (
    <View style={[styles.spotBadge, { borderColor: color + '60', backgroundColor: color + '18' }]}>
      <View style={[styles.spotDot, { backgroundColor: color }]} />
      <Text style={[styles.spotBadgeText, { color }]}>{availableSpots}/{totalSpots} · {label}</Text>
    </View>
  );
}

function InfoHeader({ navigation, title }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={T.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 40 }} />
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

  useEffect(() => { if (!passedParking) loadParking(); }, [parkingId]);
  useEffect(() => { if (parking && lat && lng) loadRoute(); }, [parking]);

  const loadParking = async () => {
    setLoading(true);
    try { setParking(await getParkingById(parkingId, { lat, lng })); }
    catch { Alert.alert('Error', 'Failed to load parking details.'); }
    finally { setLoading(false); }
  };

  const loadRoute = async () => {
    if (!parking || !lat || !lng) return;
    setLoadingRoute(true);
    try { setRouteInfo(await fetchOSMRoute(lat, lng, parking.lat, parking.lng)); }
    catch (_) {} finally { setLoadingRoute(false); }
  };

  const handleBook = () => {
    if (!parking) return;
    Alert.alert(
      'Book This Spot',
      `Confirm booking at "${parking.name}"?\n\n${formatRate(parking)}`,
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
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${parking.lat},${parking.lng}`
      : `google.navigation:q=${parking.lat},${parking.lng}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/?daddr=${parking.lat},${parking.lng}`)
    );
  };

  if (loading) return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <InfoHeader navigation={navigation} title="Parking Details" />
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={T.gold} />
        <Text style={styles.loadingText}>Loading details…</Text>
      </View>
    </SafeAreaView>
  );

  if (!parking) return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <InfoHeader navigation={navigation} title="Parking Details" />
      <View style={styles.centered}>
        <Ionicons name="car-outline" size={60} color={T.textMuted} />
        <Text style={styles.loadingText}>Parking not found</Text>
      </View>
    </SafeAreaView>
  );

  const rateLabel = formatRate(parking);
  const isPrivate = parking.isPrivate;
  const etaText = routeInfo
    ? routeInfo.duration < 60 ? '< 1 min' : `${Math.round(routeInfo.duration / 60)} min`
    : null;
  const routeDistText = routeInfo
    ? routeInfo.distance < 1000
      ? `${Math.round(routeInfo.distance)} m`
      : `${(routeInfo.distance / 1000).toFixed(1)} km`
    : null;
  const mapMarkers = [{ id: parking.id, lat: parking.lat, lng: parking.lng, type: parking.type, name: parking.name, address: parking.address, rate: rateLabel }];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <InfoHeader navigation={navigation} title={parking.name} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="car" size={28} color={T.gold} />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{parking.name}</Text>
              <View style={styles.heroBadgeRow}>
                <View style={[styles.typeBadge, {
                  backgroundColor: isPrivate ? 'rgba(167,139,250,0.18)' : T.tealLight,
                  borderColor: isPrivate ? 'rgba(167,139,250,0.35)' : 'rgba(10,181,160,0.35)',
                }]}>
                  <Ionicons name={isPrivate ? 'lock-closed' : 'earth'} size={11}
                    color={isPrivate ? T.purple : T.teal} />
                  <Text style={[styles.typeBadgeText, { color: isPrivate ? T.purple : T.teal }]}>
                    {isPrivate ? 'Private' : 'Public'}
                  </Text>
                </View>
              </View>
            </View>
            <SpotBadge
              availableSpots={parking.availableSpots || 0}
              totalSpots={parking.totalSpots || 1}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: T.goldLight }]}>
                <Ionicons name="location" size={14} color={T.gold} />
              </View>
              <Text style={styles.infoText}>{parking.address}</Text>
            </View>
            {parking.distance != null && (
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: T.tealLight }]}>
                  <Ionicons name="navigate" size={14} color={T.teal} />
                </View>
                <Text style={styles.infoText}>{parking.distance} km from destination</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: 'rgba(167,139,250,0.12)' }]}>
                <Ionicons name="time" size={14} color={T.purple} />
              </View>
              <Text style={styles.infoText}>
                Open {parking.availableFrom || '00:00'} – {parking.availableTo || '23:59'}
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash-outline" size={16} color={T.gold} />
            <Text style={styles.cardTitle}>Pricing</Text>
          </View>
          <View style={styles.pricingRow}>
            <View style={styles.priceBlock}>
              <Text style={styles.priceVal}>{rateLabel}</Text>
              <Text style={styles.priceLabel}>Best rate</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceBlock}>
              <Text style={styles.priceVal}>
                {parking.costPerDay > 0 ? `£${parking.costPerDay.toFixed(2)}` : 'Free'}
              </Text>
              <Text style={styles.priceLabel}>Per day</Text>
            </View>
            {parking.costPerHour > 0 && (
              <>
                <View style={styles.priceDivider} />
                <View style={styles.priceBlock}>
                  <Text style={styles.priceVal}>£{parking.costPerHour.toFixed(2)}</Text>
                  <Text style={styles.priceLabel}>Per hour</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Route info */}
        {(etaText || loadingRoute) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="navigate-outline" size={16} color={T.teal} />
              <Text style={styles.cardTitle}>Route from Your Location</Text>
            </View>
            {loadingRoute ? (
              <ActivityIndicator color={T.gold} />
            ) : (
              <View style={styles.routeGrid}>
                <View style={styles.routeCell}>
                  <Ionicons name="navigate-outline" size={22} color={T.teal} />
                  <Text style={styles.routeVal}>{routeDistText}</Text>
                  <Text style={styles.routeLabel}>Distance</Text>
                </View>
                <View style={[styles.routeCell, { borderLeftWidth: 1, borderLeftColor: T.border }]}>
                  <Ionicons name="time-outline" size={22} color={T.gold} />
                  <Text style={styles.routeVal}>{etaText}</Text>
                  <Text style={styles.routeLabel}>Drive time</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Map card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="map-outline" size={16} color={T.purple} />
            <Text style={styles.cardTitle}>
              Location{routeInfo ? ' + Route' : loadingRoute ? ' (loading…)' : ''}
            </Text>
          </View>
          <View style={styles.mapContainer}>
            <LeafletMapView
              ref={mapRef}
              centerLat={parking.lat} centerLng={parking.lng} zoom={15}
              markers={mapMarkers} route={routeInfo?.coords || null}
              userLat={lat} userLng={lng}
            />
          </View>
          <TouchableOpacity style={styles.openMapBtn} onPress={handleNavigate}>
            <Ionicons name="navigate" size={14} color={T.bg} />
            <Text style={styles.openMapBtnText}>Open Navigation</Text>
          </TouchableOpacity>
        </View>

        {/* Availability */}
        {parking.availableDays && parking.availableDays.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={16} color={T.teal} />
              <Text style={styles.cardTitle}>Availability</Text>
            </View>
            <View style={styles.daysRow}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
                const active = parking.availableDays.includes(day);
                return (
                  <View key={day} style={[styles.dayChip,
                    active ? { backgroundColor: T.teal, borderColor: T.teal }
                           : { backgroundColor: T.surface2, borderColor: T.border }
                  ]}>
                    <Text style={[styles.dayChipText, { color: active ? T.bg : T.textMuted }]}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {parking.description ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle-outline" size={16} color={T.textMuted} />
              <Text style={styles.cardTitle}>About This Parking</Text>
            </View>
            <Text style={styles.descText}>{parking.description}</Text>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.navBtn} onPress={handleNavigate} activeOpacity={0.85}>
          <Ionicons name="navigate" size={18} color={T.teal} />
          <Text style={styles.navBtnText}>Navigate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={18} color={T.bg} />
          <Text style={styles.bookBtnText}>Book This Spot</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: {
    backgroundColor: T.surface, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '800', color: T.text,
    flex: 1, textAlign: 'center', marginHorizontal: 8,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14, color: T.textMuted },
  scroll: { flex: 1 },

  heroCard: {
    backgroundColor: T.surface, margin: 14, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: T.goldLight, borderWidth: 1, borderColor: T.goldBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 18, fontWeight: '900', color: T.text, marginBottom: 8, lineHeight: 24 },
  heroBadgeRow: { flexDirection: 'row', gap: 6 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  spotBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  spotDot: { width: 7, height: 7, borderRadius: 3.5 },
  spotBadgeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: T.border, marginBottom: 14 },
  infoList: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  infoText: { flex: 1, fontSize: 13, color: T.textMuted, lineHeight: 20, paddingTop: 4 },

  card: {
    backgroundColor: T.surface, marginHorizontal: 14, marginBottom: 12,
    borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: T.text, textTransform: 'uppercase', letterSpacing: 0.8 },

  pricingRow: { flexDirection: 'row', alignItems: 'center' },
  priceBlock: { flex: 1, alignItems: 'center', gap: 4 },
  priceVal: { fontSize: 24, fontWeight: '900', color: T.text },
  priceLabel: { fontSize: 11, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceDivider: { width: 1, height: 48, backgroundColor: T.border },

  routeGrid: { flexDirection: 'row' },
  routeCell: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  routeVal: { fontSize: 20, fontWeight: '900', color: T.text },
  routeLabel: { fontSize: 11, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },

  mapContainer: { height: 200, borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  openMapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: T.teal, paddingVertical: 12, borderRadius: 12,
  },
  openMapBtnText: { color: T.bg, fontSize: 14, fontWeight: '800' },

  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    width: 44, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  dayChipText: { fontSize: 12, fontWeight: '700' },
  descText: { fontSize: 13, color: T.textMuted, lineHeight: 21 },

  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 16, gap: 12,
    backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border,
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    flex: 1, paddingVertical: 15, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(10,181,160,0.4)',
    backgroundColor: T.tealLight, gap: 8,
  },
  navBtnText: { color: T.teal, fontWeight: '800', fontSize: 15 },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    flex: 2, paddingVertical: 15, borderRadius: 16,
    backgroundColor: T.gold, gap: 8,
    shadowColor: T.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  bookBtnText: { color: T.bg, fontWeight: '900', fontSize: 16 },
});
