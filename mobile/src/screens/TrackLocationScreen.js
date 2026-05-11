// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
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
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LocationInput from '../components/LocationInput';
import LeafletMapView from '../components/LeafletMapView';
import { fetchOSMParkings, fetchOSMRoute, formatRate, searchPhoton } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import BrandFooter from '../components/BrandFooter';


const PRIORITY_OPTIONS = [
  { id: 'distance', label: 'Nearest Parking', icon: 'locate', sortBy: 'distance' },
  { id: 'cost', label: 'Cheapest First', icon: 'cash', sortBy: 'cost' },
  { id: 'type', label: 'By Parking Type', icon: 'layers', sortBy: 'type' },
];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TrackLocationScreen({ navigation, route }) {
  const { T } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);

  const [locationStatus, setLocationStatus] = useState('idle');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  const [priority, setPriority] = useState('distance');

  // Live tracking
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [nearbyParkings, setNearbyParkings] = useState([]);
  const watchRef = useRef(null);
  const lastPosRef = useRef(null);
  const lastSpeedRef = useRef(0);
  const suggestionCooldownRef = useRef(false);

  // Suggestion banner
  const [suggestion, setSuggestion] = useState(null);
  const bannerAnim = useRef(new Animated.Value(0)).current;

  // Map
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    detectLocation();
    return () => stopLiveTracking();
  }, []);

  const detectLocation = async () => {
    setLocationStatus('detecting');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('error');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      let label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      try {
        const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addr) label = [addr.name, addr.street, addr.city].filter(Boolean).join(', ');
      } catch (_) {}
      setCurrentLocation({ lat: latitude, lng: longitude });
      setLocationLabel(label);
      setLocationStatus('detected');
      setMapCenter({ lat: latitude, lng: longitude });
      lastPosRef.current = { lat: latitude, lng: longitude, ts: Date.now() };
    } catch (_) {
      setLocationStatus('error');
      const lat = 51.5074, lng = -0.1278;
      setCurrentLocation({ lat, lng });
      setLocationLabel('Demo Location (London, UK)');
      setLocationStatus('detected');
      setMapCenter({ lat, lng });
    }
  };

  const startLiveTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location permission is needed for live tracking.');
      return;
    }
    setIsLiveTracking(true);
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 20, timeInterval: 3000 },
      onPositionUpdate
    );
  };

  const stopLiveTracking = () => {
    setIsLiveTracking(false);
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  };

  const toggleLiveTracking = () => {
    if (isLiveTracking) stopLiveTracking();
    else startLiveTracking();
  };

  const onPositionUpdate = useCallback(async (loc) => {
    const { latitude: lat, longitude: lng, speed } = loc.coords;
    const now = Date.now();
    const speedKmh = speed != null ? speed * 3.6 : 0;
    const prev = lastPosRef.current;
    let prevSpeed = lastSpeedRef.current;

    if (speed == null && prev) {
      const dt = (now - prev.ts) / 1000;
      if (dt > 0) {
        const dist = haversineKm(prev.lat, prev.lng, lat, lng) * 1000;
        prevSpeed = (dist / dt) * 3.6;
      }
    }

    lastPosRef.current = { lat, lng, ts: now };
    lastSpeedRef.current = speedKmh || prevSpeed;

    mapRef.current?.updateUserPosition(lat, lng);
    setCurrentLocation({ lat, lng });

    if (!suggestionCooldownRef.current) {
      const distToDest = destCoords ? haversineKm(lat, lng, destCoords.lat, destCoords.lng) * 1000 : null;
      const braking = prevSpeed > 25 && speedKmh < 10;
      const crawling = speedKmh >= 1 && speedKmh <= 8;
      const nearDest = distToDest !== null && distToDest < 800;

      if (nearDest || braking || crawling) {
        triggerParkingSuggestion(lat, lng);
      }
    }
  }, [destCoords]);

  const triggerParkingSuggestion = async (lat, lng) => {
    suggestionCooldownRef.current = true;
    setTimeout(() => { suggestionCooldownRef.current = false; }, 120000);

    try {
      const parkings = await fetchOSMParkings(lat, lng, 800);
      if (!parkings.length) return;

      const nearest = parkings.sort((a, b) => (a.distance || 0) - (b.distance || 0))[0];
      setNearbyParkings(parkings.slice(0, 5));

      let routeInfo = null;
      try {
        routeInfo = await fetchOSMRoute(lat, lng, nearest.lat, nearest.lng);
        if (routeInfo) mapRef.current?.drawRoute(routeInfo.coords);
      } catch (_) {}

      const distM = nearest.distance ? nearest.distance * 1000 : null;
      const distText = distM
        ? distM < 1000 ? `${Math.round(distM)} m` : `${(distM / 1000).toFixed(1)} km`
        : '—';
      const etaText = routeInfo
        ? routeInfo.duration < 60 ? `<1 min` : `${Math.round(routeInfo.duration / 60)} min`
        : '—';

      setSuggestion({ parking: nearest, distText, etaText, route: routeInfo });
      showBanner();
    } catch (_) {}
  };

  const showBanner = () => {
    Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }).start();
  };

  const hideBanner = () => {
    Animated.timing(bannerAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setSuggestion(null));
  };

  const navigateToNearest = () => {
    if (!suggestion?.parking) return;
    const { lat, lng } = suggestion.parking;
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${lat},${lng}`
      : `google.navigation:q=${lat},${lng}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}`)
    );
  };

  const viewAllSuggested = () => {
    hideBanner();
    if (currentLocation) {
      navigation.navigate('SearchResults', {
        from: locationLabel,
        to: destination || 'Nearby',
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        sortBy: 'distance',
      });
    }
  };

  const handleFindParking = async () => {
    if (locationStatus !== 'detected' || !currentLocation) {
      Alert.alert('Location Not Ready', 'Please wait for your location to be detected.');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('Missing Destination', 'Please enter where you want to go.');
      return;
    }
    let resolvedDest = destCoords;
    if (!resolvedDest) {
      try {
        const hits = await searchPhoton(destination.trim());
        if (hits.length > 0) resolvedDest = { lat: hits[0].lat, lng: hits[0].lng };
      } catch (_) {}
    }
    const selectedPriority = PRIORITY_OPTIONS.find((p) => p.id === priority);
    navigation.navigate('SearchResults', {
      from: locationLabel,
      to: destination.trim(),
      lat: resolvedDest?.lat || currentLocation.lat,
      lng: resolvedDest?.lng || currentLocation.lng,
      priority,
      sortBy: selectedPriority?.sortBy || 'distance',
    });
  };

  const bannerTranslateY = bannerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track My Location</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* MAP */}
      <View style={styles.mapContainer}>
        {mapCenter ? (
          <LeafletMapView
            key={mapKey}
            ref={mapRef}
            centerLat={mapCenter.lat}
            centerLng={mapCenter.lng}
            zoom={15}
            markers={nearbyParkings.map((p) => ({
              id: p.id, lat: p.lat, lng: p.lng, type: p.type,
              name: p.name, address: p.address, rate: formatRate(p),
            }))}
            userLat={mapCenter.lat}
            userLng={mapCenter.lng}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator color={T.teal} />
            <Text style={styles.mapPlaceholderText}>Waiting for GPS…</Text>
          </View>
        )}

        {/* Live P Button */}
        <TouchableOpacity
          style={[styles.livePBtn, isLiveTracking && styles.livePBtnActive]}
          onPress={toggleLiveTracking}
          activeOpacity={0.85}
        >
          <Text style={[styles.livePText, isLiveTracking && styles.livePTextActive]}>P</Text>
          {isLiveTracking && <View style={styles.liveDot} />}
        </TouchableOpacity>

        {/* Suggestion Banner */}
        {suggestion && (
          <Animated.View style={[styles.suggestionBanner, { transform: [{ translateY: bannerTranslateY }] }]}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionIcon}>🅿️</Text>
              <View style={styles.suggestionTitleWrap}>
                <Text style={styles.suggestionTitle}>Nearest Parking Found</Text>
                <Text style={styles.suggestionSubtitle} numberOfLines={1}>{suggestion.parking.name}</Text>
              </View>
              <TouchableOpacity onPress={hideBanner} style={styles.suggestionClose}>
                <Ionicons name="close" size={18} color={T.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.suggestionGrid}>
              <View style={styles.suggestionCell}>
                <Text style={styles.cellLabel}>💰 Rate</Text>
                <Text style={styles.cellValue}>{formatRate(suggestion.parking)}</Text>
              </View>
              <View style={styles.suggestionCell}>
                <Text style={styles.cellLabel}>📏 Distance</Text>
                <Text style={styles.cellValue}>{suggestion.distText}</Text>
              </View>
              <View style={styles.suggestionCell}>
                <Text style={styles.cellLabel}>📍 Address</Text>
                <Text style={styles.cellValue} numberOfLines={1}>{suggestion.parking.address}</Text>
              </View>
              <View style={styles.suggestionCell}>
                <Text style={styles.cellLabel}>⏱ ETA</Text>
                <Text style={styles.cellValue}>{suggestion.etaText}</Text>
              </View>
            </View>

            <View style={styles.suggestionActions}>
              <TouchableOpacity style={styles.navBtn} onPress={navigateToNearest} activeOpacity={0.85}>
                <Text style={styles.navBtnText}>Navigate →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.viewAllBtn} onPress={viewAllSuggested} activeOpacity={0.85}>
                <Text style={styles.viewAllBtnText}>View All</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>

      {/* FORM */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Location card */}
        <View style={styles.locationCard}>
          <View style={styles.locationCardHeader}>
            <Ionicons name="navigate-circle" size={24} color={T.teal} />
            <Text style={styles.locationCardTitle}>Your Current Location</Text>
            <TouchableOpacity onPress={detectLocation} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={18} color={T.teal} />
            </TouchableOpacity>
          </View>

          {locationStatus === 'detecting' && (
            <View style={styles.detectingRow}>
              <ActivityIndicator size="small" color={T.teal} />
              <Text style={styles.detectingText}>Detecting your location...</Text>
            </View>
          )}

          {locationStatus === 'detected' && (
            <View style={styles.detectedRow}>
              <View style={styles.detectedDot} />
              <View style={styles.detectedInfo}>
                <Text style={styles.detectedLabel}>{locationLabel}</Text>
                {currentLocation && (
                  <Text style={styles.coordsText}>
                    {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                  </Text>
                )}
              </View>
              <Ionicons name="checkmark-circle" size={22} color={T.success} />
            </View>
          )}

          {locationStatus === 'error' && (
            <View style={styles.errorRow}>
              <Ionicons name="warning" size={18} color={T.error} />
              <Text style={styles.errorText}>Could not detect location. Tap refresh to retry.</Text>
            </View>
          )}

          {locationStatus === 'idle' && (
            <TouchableOpacity style={styles.detectBtn} onPress={detectLocation}>
              <Ionicons name="navigate" size={16} color="#ffffff" />
              <Text style={styles.detectBtnText}>Detect My Location</Text>
            </TouchableOpacity>
          )}

          {isLiveTracking && (
            <View style={styles.liveTrackingBadge}>
              <View style={styles.liveTrackingDot} />
              <Text style={styles.liveTrackingText}>Live tracking active — will suggest parking automatically</Text>
            </View>
          )}
        </View>

        {/* Destination */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>DESTINATION</Text></View>
          </View>
          <LocationInput
            label="Where are you going?"
            value={destination}
            onChangeText={setDestination}
            onLocationSelect={(loc) => setDestCoords({ lat: loc.lat, lng: loc.lng })}
            placeholder="Enter destination address"
            icon="flag"
          />
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>PRIORITY</Text></View>
            <Text style={styles.sectionSubLabel}>What matters most?</Text>
          </View>
          {PRIORITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.priorityRow, priority === opt.id && styles.priorityRowSelected]}
              onPress={() => setPriority(opt.id)}
              activeOpacity={0.75}
            >
              <View style={[styles.priorityIconWrap, priority === opt.id && styles.priorityIconWrapSelected]}>
                <Ionicons name={opt.icon} size={20} color={priority === opt.id ? '#ffffff' : T.teal} />
              </View>
              <Text style={[styles.priorityLabel, priority === opt.id && styles.priorityLabelSelected]}>
                {opt.label}
              </Text>
              <View style={[styles.radioOuter, priority === opt.id && styles.radioOuterSelected]}>
                {priority === opt.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <BrandFooter />
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Find Parking Button */}
      <View style={styles.btnContainer}>
        <TouchableOpacity
          style={[styles.findBtn, locationStatus !== 'detected' && styles.findBtnDisabled]}
          onPress={handleFindParking}
          activeOpacity={0.85}
          disabled={locationStatus !== 'detected'}
        >
          <Ionicons name="search" size={20} color={T.teal} />
          <Text style={styles.findBtnText}>Find Parking Near Me</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function createStyles(T) { return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.bg },
  header: {
    backgroundColor: T.teal, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 },

  mapContainer: { height: 220, position: 'relative', borderBottomWidth: 1, borderBottomColor: T.border },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface2, gap: 8 },
  mapPlaceholderText: { fontSize: 13, color: T.textMuted },

  livePBtn: {
    position: 'absolute', bottom: 12, right: 12,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: T.teal,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  livePBtnActive: { backgroundColor: '#e53935', borderColor: '#e53935' },
  livePText: { fontSize: 18, fontWeight: '900', color: T.teal },
  livePTextActive: { color: '#ffffff' },
  liveDot: {
    position: 'absolute', top: 4, right: 4,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#e53935',
  },

  suggestionBanner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: T.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 14, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8,
  },
  suggestionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  suggestionIcon: { fontSize: 24 },
  suggestionTitleWrap: { flex: 1 },
  suggestionTitle: { fontSize: 13, fontWeight: '800', color: T.teal },
  suggestionSubtitle: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  suggestionClose: { padding: 4 },
  suggestionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  suggestionCell: {
    flex: 1, minWidth: '45%', backgroundColor: T.surface2,
    borderRadius: 8, padding: 8,
  },
  cellLabel: { fontSize: 10, color: T.textMuted, fontWeight: '600', marginBottom: 2 },
  cellValue: { fontSize: 13, fontWeight: '700', color: T.text },
  suggestionActions: { flexDirection: 'row', gap: 10 },
  navBtn: {
    flex: 1, backgroundColor: T.teal, borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  viewAllBtn: {
    flex: 1, backgroundColor: T.goldLight, borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: T.goldBorder,
  },
  viewAllBtnText: { color: T.gold, fontWeight: '700', fontSize: 13 },

  scroll: { flex: 1 },
  locationCard: {
    backgroundColor: T.surface, margin: 16, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  locationCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  locationCardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: T.teal },
  refreshBtn: {
    padding: 6, borderRadius: 8, backgroundColor: T.surface2,
    borderWidth: 1, borderColor: T.border,
  },
  detectingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  detectingText: { fontSize: 14, color: T.textMuted, fontStyle: 'italic' },
  detectedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(10,181,160,0.1)', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(10,181,160,0.3)',
  },
  detectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.success },
  detectedInfo: { flex: 1 },
  detectedLabel: { fontSize: 13, fontWeight: '600', color: T.text },
  coordsText: { fontSize: 11, color: T.textMuted, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,107,107,0.1)', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
  },
  errorText: { flex: 1, fontSize: 13, color: T.error },
  detectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.teal, borderRadius: 10, paddingVertical: 12, gap: 8,
  },
  detectBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  liveTrackingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(229,57,53,0.1)', borderRadius: 8, padding: 10, marginTop: 10,
    borderWidth: 1, borderColor: 'rgba(229,57,53,0.3)',
  },
  liveTrackingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e53935' },
  liveTrackingText: { flex: 1, fontSize: 11, color: '#e53935', fontWeight: '600' },

  section: {
    backgroundColor: T.surface, marginHorizontal: 16, marginBottom: 16, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  sectionBadge: { backgroundColor: T.teal, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  sectionBadgeText: { color: '#ffffff', fontWeight: '800', fontSize: 12, letterSpacing: 1.5 },
  sectionSubLabel: { fontSize: 13, color: T.textMuted },
  priorityRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 10, marginBottom: 8, borderWidth: 1.5, borderColor: T.border,
    backgroundColor: T.surface2, gap: 12,
  },
  priorityRowSelected: { borderColor: T.teal, backgroundColor: T.tealLight },
  priorityIconWrap: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: T.tealLight,
    alignItems: 'center', justifyContent: 'center',
  },
  priorityIconWrapSelected: { backgroundColor: T.teal },
  priorityLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: T.text },
  priorityLabelSelected: { color: T.teal, fontWeight: '700' },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: T.teal },
  radioInner: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: T.teal },

  btnContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: T.surface,
    borderTopWidth: 1, borderTopColor: T.border,
  },
  findBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.gold, borderRadius: 14, paddingVertical: 15, gap: 10,
    shadowColor: T.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  findBtnDisabled: { backgroundColor: T.surface2, shadowOpacity: 0, elevation: 0 },
  findBtnText: { fontSize: 16, fontWeight: '800', color: T.teal, letterSpacing: 0.5 },
});
}
