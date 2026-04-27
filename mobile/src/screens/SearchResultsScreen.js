// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ParkingCard from '../components/ParkingCard';
import LeafletMapView from '../components/LeafletMapView';
import { getParkings, fetchOSMParkings } from '../services/api';

const T = {
  bg: '#0d1b2a',
  surface: '#142033',
  surface2: '#1c2e44',
  border: '#243350',
  gold: '#f0a500',
  goldLight: 'rgba(240,165,0,0.15)',
  teal: '#0ab5a0',
  text: '#e2eaf4',
  textMuted: '#6e92b5',
  white: '#ffffff',
  error: '#ff6b6b',
};

const FILTER_CHIPS = [
  { id: 'all', label: 'All', icon: 'grid-outline' },
  { id: 'cost', label: 'Cheapest', icon: 'cash-outline' },
  { id: 'distance', label: 'Nearest', icon: 'location-outline' },
  { id: 'private', label: 'Private', icon: 'lock-closed-outline' },
  { id: 'public', label: 'Public', icon: 'earth-outline' },
];

export default function SearchResultsScreen({ navigation, route }) {
  const {
    from = '', to = '', lat, lng,
    sortBy: initialSortBy = 'distance',
  } = route.params || {};

  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(initialSortBy || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(true);
  const mapRef = useRef(null);

  const fetchParkings = useCallback(async (filter, search) => {
    setLoading(true);
    try {
      let data = [];
      if (lat && lng) {
        const typeFilter = filter === 'private' ? 'private' : filter === 'public' ? 'surface' : '';
        data = await fetchOSMParkings(lat, lng, 2000, typeFilter);
      }
      if (!data || data.length === 0) {
        data = await getParkings({ sortBy: filter === 'all' ? undefined : filter, lat, lng, search: search || undefined });
      }
      if (filter === 'private') data = data.filter(p => p.isPrivate);
      else if (filter === 'public') data = data.filter(p => !p.isPrivate);
      if (search) {
        const term = search.toLowerCase();
        data = data.filter(p => p.name.toLowerCase().includes(term) || p.address.toLowerCase().includes(term));
      }
      if (filter === 'cost') data.sort((a, b) => a.costPerHour - b.costPerHour);
      else if (filter === 'distance') data.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
      setParkings(data);
    } catch {
      Alert.alert('Error', 'Failed to load parking results.');
      setParkings([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => { fetchParkings(activeFilter, searchQuery); }, [activeFilter]);

  const handleCardPress = (parking) => navigation.navigate('ParkingDetail', { parkingId: parking.id, parking, lat, lng });
  const handleMapMarkerPress = (index) => { if (parkings[index]) handleCardPress(parkings[index]); };

  const mapMarkers = parkings.map(p => ({
    id: p.id, lat: p.lat, lng: p.lng,
    type: p.type, name: p.name, address: p.address,
    rate: p.costPerHour > 0 ? `£${p.costPerHour.toFixed(2)}/hr` : 'Free',
  }));

  const renderHeader = () => (
    <View>
      {/* Route summary */}
      <View style={styles.routeCard}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: T.teal }]} />
          <Text style={styles.routeText} numberOfLines={1}>{from || 'Your location'}</Text>
        </View>
        <View style={styles.routeConnector}>
          <View style={styles.routeLine} />
        </View>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: T.gold }]} />
          <Text style={styles.routeText} numberOfLines={1}>{to || 'Destination'}</Text>
        </View>
      </View>

      {/* Search box */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={T.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search parking name or area..."
          placeholderTextColor={T.textMuted}
          returnKeyType="search"
          onSubmitEditing={() => fetchParkings(activeFilter, searchQuery)}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); fetchParkings(activeFilter, ''); }}>
            <Ionicons name="close-circle" size={16} color={T.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_CHIPS.map(chip => (
          <TouchableOpacity
            key={chip.id}
            style={[styles.chip, activeFilter === chip.id && styles.chipActive]}
            onPress={() => setActiveFilter(chip.id)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={chip.icon}
              size={13}
              color={activeFilter === chip.id ? T.bg : T.textMuted}
            />
            <Text style={[styles.chipText, activeFilter === chip.id && styles.chipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count + map toggle */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {loading ? 'Searching…' : `${parkings.length} spot${parkings.length !== 1 ? 's' : ''} found`}
        </Text>
        <TouchableOpacity onPress={() => setShowMap(v => !v)} style={styles.toggleBtn}>
          <Ionicons name={showMap ? 'list' : 'map'} size={14} color={T.gold} />
          <Text style={styles.toggleText}>{showMap ? 'List view' : 'Map view'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parking Near You</Text>
        <View style={{ width: 40 }} />
      </View>

      {showMap && lat && lng && (
        <View style={styles.mapContainer}>
          <LeafletMapView
            ref={mapRef}
            centerLat={lat} centerLng={lng} zoom={14}
            markers={mapMarkers} userLat={lat} userLng={lng}
            onMarkerPress={handleMapMarkerPress}
          />
          {loading && (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={T.gold} />
            </View>
          )}
        </View>
      )}

      {loading && !showMap ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={T.gold} />
          <Text style={styles.loadingText}>Finding best parking spots…</Text>
        </View>
      ) : (
        <FlatList
          data={parkings}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ParkingCard parking={item} onPress={handleCardPress} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="car-outline" size={48} color={T.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No parking found</Text>
                <Text style={styles.emptyText}>Try adjusting your filters or searching a different area.</Text>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => { setActiveFilter('all'); setSearchQuery(''); fetchParkings('all', ''); }}
                >
                  <Text style={styles.resetBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerTitle: { fontSize: 16, fontWeight: '800', color: T.text },

  mapContainer: {
    height: 230, position: 'relative',
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,27,42,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14, color: T.textMuted },

  routeCard: {
    backgroundColor: T.surface, margin: 14, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: T.border,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  routeText: { flex: 1, fontSize: 13, color: T.text, fontWeight: '600' },
  routeConnector: { paddingLeft: 4, paddingVertical: 4 },
  routeLine: { width: 2, height: 12, backgroundColor: T.border, marginLeft: 3 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, marginHorizontal: 14, marginBottom: 10,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    gap: 10, borderWidth: 1, borderColor: T.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: T.text, paddingVertical: 2 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 14, marginBottom: 10, gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface,
  },
  chipActive: { backgroundColor: T.gold, borderColor: T.gold },
  chipText: { fontSize: 12, fontWeight: '600', color: T.textMuted },
  chipTextActive: { color: T.bg },

  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, marginBottom: 8,
  },
  countText: { fontSize: 13, color: T.textMuted, fontWeight: '500' },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
  },
  toggleText: { fontSize: 12, color: T.gold, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 40, gap: 12 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: T.text },
  emptyText: { fontSize: 13, color: T.textMuted, textAlign: 'center', lineHeight: 20 },
  resetBtn: {
    marginTop: 8, paddingHorizontal: 28, paddingVertical: 12,
    backgroundColor: T.gold, borderRadius: 16,
  },
  resetBtnText: { color: T.bg, fontWeight: '800', fontSize: 14 },
});
