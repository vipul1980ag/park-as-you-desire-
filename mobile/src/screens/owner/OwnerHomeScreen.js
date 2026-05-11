// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getOwnerParkings, getOwnerStats, updateParking } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';


function StatCard({ icon, value, label, color }) {
  const { T } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function OwnerParkingCard({ parking, onEdit, onToggle }) {
  const { T } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);
  const isActive = parking.availableSpots > 0;

  return (
    <View style={styles.parkingCard}>
      <View style={styles.parkingCardTop}>
        <View style={styles.parkingCardTitleRow}>
          <Text style={styles.parkingCardName} numberOfLines={1}>
            {parking.name}
          </Text>
          <View style={[styles.activeIndicator, {
            backgroundColor: isActive ? 'rgba(10,181,160,0.15)' : 'rgba(255,107,107,0.15)',
          }]}>
            <View style={[styles.activeDot, {
              backgroundColor: isActive ? T.success : T.error,
            }]} />
            <Text style={[styles.activeText, { color: isActive ? T.success : T.error }]}>
              {isActive ? 'Active' : 'Full'}
            </Text>
          </View>
        </View>
        <Text style={styles.parkingCardAddress}>{parking.address}</Text>
        <Text style={styles.parkingCardType}>{parking.type}</Text>
      </View>

      <View style={styles.parkingCardStats}>
        <View style={styles.parkingStatItem}>
          <Text style={styles.parkingStatLabel}>Spots</Text>
          <Text style={styles.parkingStatValue}>
            {parking.availableSpots}/{parking.totalSpots}
          </Text>
        </View>
        <View style={styles.parkingStatItem}>
          <Text style={styles.parkingStatLabel}>Per Hour</Text>
          <Text style={styles.parkingStatValue}>£{parking.costPerHour}</Text>
        </View>
        <View style={styles.parkingStatItem}>
          <Text style={styles.parkingStatLabel}>Per Day</Text>
          <Text style={styles.parkingStatValue}>£{parking.costPerDay}</Text>
        </View>
        <View style={styles.parkingStatItem}>
          <Text style={styles.parkingStatLabel}>Hours</Text>
          <Text style={styles.parkingStatValue}>
            {parking.availableFrom}–{parking.availableTo}
          </Text>
        </View>
      </View>

      <View style={styles.parkingCardActions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => onEdit && onEdit(parking)}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={14} color={T.teal} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, isActive ? styles.deactivateBtn : styles.activateBtn]}
          onPress={() => onToggle && onToggle(parking)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            size={14}
            color={isActive ? T.warning : T.success}
          />
          <Text style={[styles.toggleBtnText, { color: isActive ? T.warning : T.success }]}>
            {isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OwnerHomeScreen({ navigation, route }) {
  const { T } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);

  const { user, logout } = useAuth();
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState({ totalListings: 0, activeNow: 0, bookingsToday: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [listingsData, statsData] = await Promise.all([
        getOwnerParkings(user?.token),
        getOwnerStats(user?.token),
      ]);
      setListings(listingsData);
      setStats(statsData);
    } catch {
      Alert.alert('Error', 'Could not load your listings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleEdit = (parking) => {
    navigation.navigate('ListParking', { existingParking: parking });
  };

  const handleToggle = async (parking) => {
    const newSpots = parking.availableSpots > 0 ? 0 : parking.totalSpots;
    const action = parking.availableSpots > 0 ? 'deactivate' : 'activate';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Listing`,
      `Are you sure you want to ${action} "${parking.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            try {
              const updated = await updateParking(parking.id, { availableSpots: newSpots }, user?.token);
              if (updated) {
                setListings((prev) => prev.map((p) => (p.id === parking.id ? updated : p)));
              }
            } catch {
              Alert.alert('Error', 'Failed to update listing.');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View>
      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard icon="list" value={stats.totalListings} label="Total Listings" color={T.teal} />
        <StatCard icon="checkmark-circle" value={stats.activeNow} label="Active Now" color={T.success} />
        <StatCard icon="car" value={stats.bookingsToday} label="Booked Today" color={T.gold} />
      </View>

      {/* Add button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('ListParking', {})}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle" size={22} color={T.teal} />
        <Text style={styles.addBtnText}>Add New Parking Spot</Text>
        <Ionicons name="chevron-forward" size={18} color={T.teal} />
      </TouchableOpacity>

      {/* Listings title */}
      {listings.length > 0 && (
        <Text style={styles.listingsTitle}>Your Listings ({listings.length})</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Parking Owner Portal</Text>
          <Text style={styles.headerSub}>{user?.name || 'Manage your parking listings'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Sign out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: logout },
            ]);
          }}
          style={styles.backBtn}
        >
          <Ionicons name="log-out-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={T.teal} />
          <Text style={styles.loadingText}>Loading your listings...</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OwnerParkingCard parking={item} onEdit={handleEdit} onToggle={handleToggle} />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={60} color={T.border} />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptyText}>
                Tap "Add New Parking Spot" to list your first parking space and start earning.
              </Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(T) { return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.bg },
  header: {
    backgroundColor: T.teal,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#ffffff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: T.textMuted },
  list: { paddingBottom: 30 },
  statsRow: { flexDirection: 'row', margin: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: T.surface, borderRadius: 12, padding: 14,
    alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 3, elevation: 2, gap: 4,
    borderWidth: 1, borderColor: T.border,
  },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: {
    fontSize: 10, color: T.textMuted, textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.goldLight,
    marginHorizontal: 16, marginBottom: 20,
    borderRadius: 14, padding: 16, gap: 10,
    borderWidth: 1, borderColor: T.goldBorder,
  },
  addBtnText: { flex: 1, fontSize: 15, fontWeight: '800', color: T.teal },
  listingsTitle: {
    fontSize: 14, fontWeight: '700', color: T.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 16, marginBottom: 8,
  },
  parkingCard: {
    backgroundColor: T.surface, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  parkingCardTop: { marginBottom: 12 },
  parkingCardTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4, gap: 8,
  },
  parkingCardName: { flex: 1, fontSize: 15, fontWeight: '700', color: T.text },
  activeIndicator: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, gap: 4,
  },
  activeDot: { width: 7, height: 7, borderRadius: 3.5 },
  activeText: { fontSize: 11, fontWeight: '700' },
  parkingCardAddress: { fontSize: 12, color: T.textMuted, marginBottom: 2 },
  parkingCardType: { fontSize: 11, color: T.teal, fontStyle: 'italic' },
  parkingCardStats: {
    flexDirection: 'row', backgroundColor: T.surface2,
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 4, marginBottom: 12,
  },
  parkingStatItem: { flex: 1, alignItems: 'center' },
  parkingStatLabel: {
    fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2,
  },
  parkingStatValue: { fontSize: 13, fontWeight: '700', color: T.text },
  parkingCardActions: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: T.teal, gap: 5,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: T.teal },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, gap: 5,
  },
  deactivateBtn: { borderColor: T.warning },
  activateBtn: { borderColor: T.success },
  toggleBtnText: { fontSize: 13, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: T.text, marginTop: 8 },
  emptyText: { fontSize: 13, color: T.textMuted, textAlign: 'center', lineHeight: 20 },
});
}
