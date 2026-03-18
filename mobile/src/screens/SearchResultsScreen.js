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

const COLORS = {
  primary: '#1a3c5e',
  accent: '#f0a500',
  background: '#f5f5f5',
  white: '#ffffff',
  textDark: '#333333',
  textSecondary: '#666666',
  border: '#d0d8e0',
};

const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'cost', label: '💰 Cheapest' },
  { id: 'distance', label: '📍 Nearest' },
  { id: 'private', label: '🔒 Private' },
  { id: 'public', label: '🟢 Public' },
];

export default function SearchResultsScreen({ navigation, route }) {
  const {
    from = '',
    to = '',
    lat,
    lng,
    sortBy: initialSortBy = 'distance',
    priority = 'distance',
  } = route.params || {};

  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(initialSortBy || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(true);
  const mapRef = useRef(null);

  const fetchParkings = useCallback(
    async (filter, search) => {
      setLoading(true);
      try {
        let data = [];
        if (lat && lng) {
          // Try real OSM data first
          const radius = 2000;
          const typeFilter = filter === 'private' ? 'private' : filter === 'public' ? 'surface' : '';
          data = await fetchOSMParkings(lat, lng, radius, typeFilter);
        }
        if (!data || data.length === 0) {
          // Fall back to server / mock data
          const params = {
            sortBy: filter === 'all' ? undefined : filter,
            lat,
            lng,
            search: search || undefined,
          };
          data = await getParkings(params);
        }

        // Apply local filter
        if (filter === 'private') data = data.filter((p) => p.isPrivate);
        else if (filter === 'public') data = data.filter((p) => !p.isPrivate);

        if (search) {
          const term = search.toLowerCase();
          data = data.filter(
            (p) => p.name.toLowerCase().includes(term) || p.address.toLowerCase().includes(term)
          );
        }

        // Sort
        if (filter === 'cost') data.sort((a, b) => a.costPerHour - b.costPerHour);
        else if (filter === 'distance') data.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));

        setParkings(data);
      } catch (err) {
        Alert.alert('Error', 'Failed to load parking results.');
        setParkings([]);
      } finally {
        setLoading(false);
      }
    },
    [lat, lng]
  );

  useEffect(() => {
    fetchParkings(activeFilter, searchQuery);
  }, [activeFilter]);

  const handleSearch = () => fetchParkings(activeFilter, searchQuery);

  const handleCardPress = (parking) => {
    navigation.navigate('ParkingDetail', { parkingId: parking.id, parking, lat, lng });
  };

  const handleMapMarkerPress = (index) => {
    if (parkings[index]) handleCardPress(parkings[index]);
  };

  const mapMarkers = parkings.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    type: p.type,
    name: p.name,
    address: p.address,
    rate: p.costPerHour > 0 ? `£${p.costPerHour.toFixed(2)}/hr` : 'Free',
  }));

  const renderHeader = () => (
    <View>
      {/* Route summary */}
      <View style={styles.routeSummary}>
        <View style={styles.routeRow}>
          <Ionicons name="radio-button-on" size={14} color={COLORS.accent} />
          <Text style={styles.routeText} numberOfLines={1}>{from || 'Your location'}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <Ionicons name="location" size={14} color={COLORS.primary} />
          <Text style={styles.routeText} numberOfLines={1}>{to || 'Destination'}</Text>
        </View>
      </View>

      {/* Search box */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search parking name or area..."
          placeholderTextColor={COLORS.textSecondary}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); fetchParkings(activeFilter, ''); }}>
            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={[styles.filterChip, activeFilter === chip.id && styles.filterChipActive]}
            onPress={() => setActiveFilter(chip.id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, activeFilter === chip.id && styles.filterChipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Result count + map toggle */}
      <View style={styles.resultCount}>
        <Text style={styles.resultCountText}>
          {loading ? 'Searching...' : `${parkings.length} spot${parkings.length !== 1 ? 's' : ''} found`}
        </Text>
        <TouchableOpacity onPress={() => setShowMap((v) => !v)} style={styles.mapToggleBtn}>
          <Ionicons name={showMap ? 'list' : 'map'} size={14} color={COLORS.primary} />
          <Text style={styles.mapToggleText}>{showMap ? 'List' : 'Map'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parking Near You</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* MAP */}
      {showMap && lat && lng && (
        <View style={styles.mapContainer}>
          <LeafletMapView
            ref={mapRef}
            centerLat={lat}
            centerLng={lng}
            zoom={14}
            markers={mapMarkers}
            userLat={lat}
            userLng={lng}
            onMarkerPress={handleMapMarkerPress}
          />
          {loading && (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          )}
        </View>
      )}

      {loading && !showMap ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Finding best parking spots...</Text>
        </View>
      ) : (
        <FlatList
          data={parkings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ParkingCard parking={item} onPress={handleCardPress} />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={60} color={COLORS.border} />
                <Text style={styles.emptyTitle}>No parking found</Text>
                <Text style={styles.emptyText}>Try adjusting your filters or search in a different area.</Text>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => { setActiveFilter('all'); setSearchQuery(''); fetchParkings('all', ''); }}
                >
                  <Text style={styles.resetBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, letterSpacing: 0.3 },
  mapContainer: {
    height: 220,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  list: { paddingBottom: 20 },
  routeSummary: {
    backgroundColor: COLORS.white, margin: 16, borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeText: { flex: 1, fontSize: 13, color: COLORS.textDark, fontWeight: '500' },
  routeLine: { width: 1, height: 12, backgroundColor: COLORS.border, marginLeft: 7, marginVertical: 3 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 10, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textDark, paddingVertical: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.white },
  resultCount: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  resultCountText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  mapToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  mapToggleText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginTop: 8 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  resetBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 20 },
  resetBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
});
